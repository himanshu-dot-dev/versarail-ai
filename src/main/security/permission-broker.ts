import { randomUUID } from 'crypto'
import { BrowserWindow } from 'electron'
import {
  PermissionRequestDTO,
  PermissionResponseDTO,
  PermissionScope
} from '@shared/domain/models'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SqliteDatabase } from '../storage/sqlite-database'
import { computePayloadHash, ToctouTamperingError } from './payload-hash'

export interface AuthorizationRequest {
  toolName: string
  capability: 'fs:read' | 'fs:write' | 'fs:delete' | 'cmd:exec'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  targetPath?: string
  command?: string
  args?: string[]
  diffPreview?: string
  rawArguments: Record<string, unknown>
}

export interface AuthorizationResult {
  granted: boolean
  requestId: string
  payloadHash: string
  scope?: PermissionScope
  reason?: string
}

interface PendingPermission {
  resolve: (res: AuthorizationResult) => void
  reject: (err: Error) => void
  payloadHash: string
  requestDTO: PermissionRequestDTO
  timer: NodeJS.Timeout
}

export class PermissionBroker {
  private static instance: PermissionBroker | null = null
  private get db(): SqliteDatabase {
    return SqliteDatabase.getInstance()
  }
  private pendingRequests: Map<string, PendingPermission> = new Map()
  private sessionApprovals: Set<string> = new Set()
  private customEmitter?: (channel: string, payload: unknown) => void
  private testAuthorizer?: (req: PermissionRequestDTO) => Promise<PermissionResponseDTO>

  private constructor() {}

  public static getInstance(): PermissionBroker {
    if (!PermissionBroker.instance) {
      PermissionBroker.instance = new PermissionBroker()
    }
    return PermissionBroker.instance
  }

  /**
   * Resets singleton state (used for clean test isolation).
   */
  public static resetInstance(): void {
    if (PermissionBroker.instance) {
      for (const pending of PermissionBroker.instance.pendingRequests.values()) {
        clearTimeout(pending.timer)
      }
      PermissionBroker.instance.pendingRequests.clear()
      PermissionBroker.instance.sessionApprovals.clear()
      PermissionBroker.instance.testAuthorizer = undefined
      PermissionBroker.instance.customEmitter = undefined
      PermissionBroker.instance = null
    }
  }

  /**
   * Sets a test hook to programmatically handle permission requests without Electron IPC.
   */
  public setAuthorizerForTesting(
    authorizer?: (req: PermissionRequestDTO) => Promise<PermissionResponseDTO>
  ): void {
    this.testAuthorizer = authorizer
  }

  /**
   * Custom IPC event emitter for testing or headless setups.
   */
  public setCustomEmitter(emitter?: (channel: string, payload: unknown) => void): void {
    this.customEmitter = emitter
  }

  /**
   * Requests authorization for a tool call.
   * Checks session cache and persistent SQLite permissions before prompting the user.
   */
  public async requestAuthorization(
    request: AuthorizationRequest,
    timeoutMs = 60000
  ): Promise<AuthorizationResult> {
    const payloadHash = computePayloadHash(request.toolName, request.rawArguments)

    // Check if this capability is a mutating operation (file write/update or command execution)
    // Core Security Policy: Read-only operations auto-approve/cache; mutating operations MUST always get explicit authorization
    const isMutatingCapability = ['fs:write', 'cmd:exec'].includes(request.capability)

    if (!isMutatingCapability) {
      // 1. Check session-level cache (only for non-mutating/read operations)
      const sessionKey = `${request.capability}:${payloadHash}`
      if (this.sessionApprovals.has(sessionKey)) {
        return {
          granted: true,
          requestId: `session-${randomUUID()}`,
          payloadHash,
          scope: 'session'
        }
      }

      // 2. Check persistent approvals (only for non-mutating/read operations)
      const persistentApproved = this.checkPersistentApproval(request.capability, payloadHash)
      if (persistentApproved) {
        return {
          granted: true,
          requestId: `always-${randomUUID()}`,
          payloadHash,
          scope: 'always'
        }
      }
    }

    // 3. Construct DTO for approval
    const requestId = randomUUID()
    const requestDTO: PermissionRequestDTO = {
      requestId,
      capability: request.capability,
      title: request.title,
      description: request.description,
      targetPath: request.targetPath,
      command: request.command,
      args: request.args,
      diffPreview: request.diffPreview,
      payloadHash,
      riskLevel: request.riskLevel
    }

    // 4. If automated test authorizer is registered, resolve immediately
    if (this.testAuthorizer) {
      const response = await this.testAuthorizer(requestDTO)
      return this.processDecision(requestDTO, response)
    }

    // 5. Auto-approve ONLY low-risk read-only inspection operations in production runs
    if (request.riskLevel === 'low' && !isMutatingCapability) {
      return {
        granted: true,
        requestId: `auto-${randomUUID()}`,
        payloadHash,
        scope: 'session'
      }
    }

    // 5. Dispatch request to renderer over IPC
    return new Promise<AuthorizationResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        this.recordDecision(requestId, request.capability, payloadHash, 'deny', 'once')
        resolve({
          granted: false,
          requestId,
          payloadHash,
          reason: `Permission request timed out after ${timeoutMs}ms`
        })
      }, timeoutMs)

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        payloadHash,
        requestDTO,
        timer
      })

      this.emitPermissionRequest(requestDTO)
    })
  }

  /**
   * Called by IPC when user submits a decision from the Permission Modal.
   */
  public handleResponse(response: PermissionResponseDTO): boolean {
    const pending = this.pendingRequests.get(response.requestId)
    if (!pending) {
      console.warn(`[PermissionBroker] Received response for unknown requestId: ${response.requestId}`)
      return false
    }

    clearTimeout(pending.timer)
    this.pendingRequests.delete(response.requestId)

    const result = this.processDecision(pending.requestDTO, response)
    pending.resolve(result)
    return true
  }

  /**
   * Validates tool arguments against the approved payload hash immediately before execution.
   * Throws ToctouTamperingError if any argument has been mutated post-approval.
   */
  public verifyExecution(
    receipt: AuthorizationResult,
    currentArgs: Record<string, unknown>,
    toolName: string
  ): void {
    if (!receipt.granted) {
      throw new Error(`Execution rejected: Permission was not granted for tool "${toolName}"`)
    }

    const currentHash = computePayloadHash(toolName, currentArgs)
    if (currentHash !== receipt.payloadHash) {
      const err = new ToctouTamperingError(
        `[Security Alert] TOCTOU Tampering Detected for tool "${toolName}"! ` +
        `Approved payload hash: ${receipt.payloadHash}, Current payload hash: ${currentHash}. Execution aborted.`
      )
      console.error(err.message)
      throw err
    }
  }

  private processDecision(
    request: PermissionRequestDTO,
    response: PermissionResponseDTO
  ): AuthorizationResult {
    const scope = response.rememberScope || 'once'
    const isGranted = response.decision === 'allow'

    // Persist decision into SQLite audit table
    this.recordDecision(
      response.requestId,
      request.capability,
      request.payloadHash,
      response.decision,
      scope
    )

    if (isGranted) {
      const isMutatingCapability = ['fs:write', 'cmd:exec'].includes(request.capability)
      // Only cache session approvals for non-mutating/read operations.
      // Every write or command execution must be explicitly confirmed by the user.
      if (!isMutatingCapability && (scope === 'session' || scope === 'always')) {
        const sessionKey = `${request.capability}:${request.payloadHash}`
        this.sessionApprovals.add(sessionKey)
      }

      return {
        granted: true,
        requestId: response.requestId,
        payloadHash: request.payloadHash,
        scope
      }
    }

    return {
      granted: false,
      requestId: response.requestId,
      payloadHash: request.payloadHash,
      reason: 'User denied authorization'
    }
  }

  private checkPersistentApproval(capability: string, payloadHash: string): boolean {
    try {
      const stmt = this.db.prepare(`
        SELECT id FROM permission_decisions
        WHERE capability = ? AND payload_hash = ? AND decision = 'allow' AND remember_scope = 'always'
        LIMIT 1
      `)
      const row = stmt.get(capability, payloadHash)
      return !!row
    } catch (err) {
      console.error('[PermissionBroker] Failed to query persistent decisions:', err)
      return false
    }
  }

  private recordDecision(
    requestId: string,
    capability: string,
    payloadHash: string,
    decision: 'allow' | 'deny',
    scope: PermissionScope
  ): void {
    try {
      const now = new Date().toISOString()
      const stmt = this.db.prepare(`
        INSERT INTO permission_decisions (id, request_id, capability, payload_hash, decision, remember_scope, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(randomUUID(), requestId, capability, payloadHash, decision, scope, now)
    } catch (err) {
      console.error('[PermissionBroker] Failed to persist permission decision:', err)
    }
  }

  private emitPermissionRequest(requestDTO: PermissionRequestDTO): void {
    if (this.customEmitter) {
      this.customEmitter(IPC_CHANNELS.PERMISSION_REQUEST, requestDTO)
      return
    }

    try {
      const windows = BrowserWindow?.getAllWindows ? BrowserWindow.getAllWindows() : []
      if (windows.length > 0 && windows[0]?.webContents) {
        windows[0].webContents.send(IPC_CHANNELS.PERMISSION_REQUEST, requestDTO)
      }
    } catch (err) {
      console.error('[PermissionBroker] Error sending permission request over IPC:', err)
    }
  }
}
