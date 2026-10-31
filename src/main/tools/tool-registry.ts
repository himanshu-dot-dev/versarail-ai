import { ITool, ToolExecutionContext } from './tool.interface'
import { ReadFileTool } from './builtin/read-file.tool'
import { FileSearchTool } from './builtin/file-search-tool'
import { WriteFileTool } from './builtin/write-file.tool'
import { ListDirTool } from './builtin/list-dir.tool'
import { ExecCmdTool } from './builtin/exec-cmd.tool'
import { PermissionBroker } from '../security/permission-broker'
import { SecretRedactor } from '../security/secret-redactor'
import { ConversationStore } from '../storage/conversation-store'
import { ToctouTamperingError } from '../security/payload-hash'

export interface ToolExecutionResponse {
  success: boolean
  toolName: string
  result?: unknown
  error?: string
  executionDurationMs?: number
}

export class ToolRegistry {
  private static instance: ToolRegistry | null = null
  private tools: Map<string, ITool> = new Map()
  private broker: PermissionBroker
  private convStore: ConversationStore

  private constructor() {
    this.broker = PermissionBroker.getInstance()
    this.convStore = ConversationStore.getInstance()
    this.registerDefaults()
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  public static resetInstance(): void {
    ToolRegistry.instance = null
  }

  private registerDefaults(): void {
    this.registerTool(new ReadFileTool())
    this.registerTool(new FileSearchTool())
    this.registerTool(new WriteFileTool())
    this.registerTool(new ListDirTool())
    this.registerTool(new ExecCmdTool())
  }

  public registerTool(tool: ITool): void {
    this.tools.set(tool.name, tool)
  }

  public getTool(name: string): ITool | undefined {
    if (this.tools.has(name)) {
      return this.tools.get(name)
    }
    // Handle aliases
    if (name === 'file_read') {
      return this.tools.get('read_file')
    }
    if (name === 'search_files') {
      return this.tools.get('file_search')
    }
    return undefined
  }

  public listTools(): ITool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Executes a registered tool with full security policy enforcement:
   * 1. Schema validation (Zod)
   * 2. Permission Broker authorization
   * 3. TOCTOU payload hash verification
   * 4. SQLite audit logging
   * 5. Secret redaction on output
   */
  public async executeTool(
    toolName: string,
    rawArgs: Record<string, unknown>,
    context: ToolExecutionContext = {}
  ): Promise<ToolExecutionResponse> {
    const startTime = Date.now()
    const tool = this.getTool(toolName)

    if (!tool) {
      return {
        success: false,
        toolName,
        error: `Tool "${toolName}" is not registered in ToolRegistry`
      }
    }

    // 1. Zod input schema validation
    const parsed = tool.inputSchema.safeParse(rawArgs)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      return {
        success: false,
        toolName,
        error: `Validation error for tool "${toolName}": ${issues}`
      }
    }

    const validatedInput = parsed.data as Record<string, unknown>

    // 2. Request authorization from Permission Broker
    const details = tool.formatPermissionRequest(validatedInput, context)
    const authReceipt = await this.broker.requestAuthorization({
      toolName: tool.name,
      capability: tool.capability,
      riskLevel: tool.riskLevel,
      title: details.title,
      description: details.description,
      targetPath: details.targetPath,
      command: details.command,
      args: details.args,
      diffPreview: details.diffPreview,
      rawArguments: validatedInput
    })

    if (!authReceipt.granted) {
      return {
        success: false,
        toolName,
        error: authReceipt.reason || `User denied permission to execute "${toolName}"`
      }
    }

    // 3. TOCTOU Defense Check: verify approved payload hash matches current input
    try {
      this.broker.verifyExecution(authReceipt, validatedInput, tool.name)
    } catch (err: any) {
      if (err instanceof ToctouTamperingError) {
        throw err
      }
      return {
        success: false,
        toolName,
        error: err.message
      }
    }

    // 4. Record tool execution start in SQLite audit log
    let toolCallId: string | undefined
    if (context.runId) {
      try {
        toolCallId = this.convStore.recordToolCallStart({
          runId: context.runId,
          toolName: tool.name,
          argumentsJson: JSON.stringify(SecretRedactor.redactObject(validatedInput))
        })
      } catch (err) {
        console.error('[ToolRegistry] Failed to record tool call start:', err)
      }
    }

    // 5. Execute the tool
    try {
      const rawResult = await tool.execute(validatedInput, context)
      const duration = Date.now() - startTime

      // 6. Redact any leaked credentials from output
      const sanitizedResult = SecretRedactor.redactObject(rawResult)

      // 7. Update SQLite audit log with success
      if (toolCallId) {
        try {
          this.convStore.completeToolCall({
            id: toolCallId,
            status: 'success',
            resultJson: JSON.stringify(sanitizedResult),
            executionDurationMs: duration
          })
        } catch (err) {
          console.error('[ToolRegistry] Failed to complete tool call record:', err)
        }
      }

      return {
        success: true,
        toolName,
        result: sanitizedResult,
        executionDurationMs: duration
      }
    } catch (err: any) {
      const duration = Date.now() - startTime

      // Update SQLite audit log with failure
      if (toolCallId) {
        try {
          this.convStore.completeToolCall({
            id: toolCallId,
            status: 'failed',
            resultJson: JSON.stringify({ error: err.message }),
            executionDurationMs: duration
          })
        } catch (dbErr) {
          console.error('[ToolRegistry] Failed to complete failed tool call record:', dbErr)
        }
      }

      return {
        success: false,
        toolName,
        error: err.message || `Execution of tool "${toolName}" failed`,
        executionDurationMs: duration
      }
    }
  }
}

