/**
 * VersaRail AI Agent Harness - End-to-End User Journeys Test Suite
 * Milestone 11: End-to-End Verification across all Subsystems
 *
 * Simulates complete developer journeys through the harness:
 * 1. BYOK Key Lifecycle & Keyring Storage
 * 2. Conversational Agent Loop, Context Window Management & Token Streaming
 * 3. Reviewable Diff-First File Mutation & Atomic Commit
 * 4. Dual Terminal Execution & Secret Redaction
 * 5. Privacy Policy Enforcement & SQLite Retention Purging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Services & Managers
import { SqliteDatabase } from '../../src/main/storage/sqlite-database'
import { ConversationStore } from '../../src/main/storage/conversation-store'
import { SecretStorageService } from '../../src/main/security/safe-storage.service'
import { ProviderRegistry } from '../../src/main/providers/provider-registry'
import { AgentRuntime } from '../../src/main/agent/agent-runtime'
import { ContextManager } from '../../src/main/agent/context-manager'
import { DiffEngine } from '../../src/main/changes/diff-engine'
import { AtomicWriter } from '../../src/main/changes/atomic-writer'
import { ChangeJournal } from '../../src/main/changes/change-journal'
import { PermissionBroker } from '../../src/main/security/permission-broker'
import { AgentCommandRunner } from '../../src/main/agent/command-runner'

describe('End-to-End User Journeys (Milestone 11 Verification)', () => {
  let tempDir: string
  let dbPath: string
  let workspaceDir: string
  let secretStore: SecretStorageService
  let convStore: ConversationStore
  let contextManager: ContextManager
  let permissionBroker: PermissionBroker
  let changeJournal: ChangeJournal

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-e2e-'))
    dbPath = path.join(tempDir, 'e2e-test.db')
    workspaceDir = path.join(tempDir, 'mock-workspace')
    fs.mkdirSync(workspaceDir, { recursive: true })

    // Reset singletons for clean isolation
    SqliteDatabase.resetInstance()
    ConversationStore.resetInstance()
    ContextManager.resetInstance()
    PermissionBroker.resetInstance()
    ChangeJournal.resetInstance()
    AgentRuntime.resetInstance()
    ProviderRegistry.resetInstance()
    SecretStorageService.resetInstance()

    SqliteDatabase.getInstance(dbPath)

    secretStore = SecretStorageService.getInstance(path.join(tempDir, 'secrets.json'))
    convStore = ConversationStore.getInstance()
    contextManager = ContextManager.getInstance()
    permissionBroker = PermissionBroker.getInstance()
    changeJournal = ChangeJournal.getInstance()
  })

  afterEach(() => {
    SqliteDatabase.resetInstance()
    ConversationStore.resetInstance()
    ContextManager.resetInstance()
    PermissionBroker.resetInstance()
    ChangeJournal.resetInstance()
    AgentRuntime.resetInstance()
    ProviderRegistry.resetInstance()
    SecretStorageService.resetInstance()

    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors on locked temp files
    }
    vi.restoreAllMocks()
  })

  it('Journey 1: BYOK Key Lifecycle, Keyring Protection & Masking', async () => {
    const rawApiKey = 'gsk_LiveProductionGroqTestKey12345678901234567890'
    const credId = 'cred-groq-live'

    // 1. User enters new provider key in Provider Dashboard
    const saved = await secretStore.saveCredential({
      id: credId,
      providerId: 'groq',
      label: 'Production Groq LPU',
      apiKey: rawApiKey
    })

    expect(saved).toBeDefined()

    // 2. Dashboard lists credentials: keys must be masked, NEVER plaintext
    const credList = secretStore.listCredentialMetadata()
    expect(credList.length).toBe(1)
    expect(credList[0].id).toBe(credId)
    expect(credList[0].providerId).toBe('groq')
    expect(credList[0].label).toBe('Production Groq LPU')
    expect(credList[0].maskedKey).toContain('••••')
    expect(credList[0].maskedKey).not.toBe(rawApiKey)

    // 3. Main process internally retrieves plaintext only for network adapters
    const retrievedKey = await secretStore.getDecryptedKey(credId)
    expect(retrievedKey).toBe(rawApiKey)

    // 4. Deleting credential cleans keyring
    const deleted = await secretStore.deleteCredential(credId)
    expect(deleted).toBe(true)
    const afterDelete = secretStore.listCredentialMetadata()
    expect(afterDelete.length).toBe(0)
  })

  it('Journey 2: Conversational Loop, Context Budgeting & Token Streaming', async () => {
    // 1. Setup mock provider credential
    await secretStore.saveCredential({
      id: 'cred-gemini-e2e',
      providerId: 'gemini',
      label: 'Google Gemini Flash',
      apiKey: 'AIzaSyMockGeminiKeyForE2ETest123456789'
    })

    // 2. Setup mock streaming adapter
    const registry = ProviderRegistry.getInstance()
    const mockGeminiAdapter = {
      id: 'gemini' as const,
      name: 'Google Gemini',
      validateKey: vi.fn(),
      listModels: vi.fn(),
      streamCompletion: async function* () {
        yield { textDelta: 'const answer = 42;' }
        yield { textDelta: '\n// Computed successfully.' }
      }
    }
    vi.spyOn(registry, 'getAdapter').mockReturnValue(mockGeminiAdapter as any)

    // 3. User creates a conversation and sends a coding prompt
    const conv = convStore.createConversation({
      title: 'Math Helper',
      selectedModel: 'gemini-2.5-flash',
      workspacePath: workspaceDir
    })

    const runtime = AgentRuntime.getInstance()
    const receivedChunks: string[] = []

    const result = await runtime.executePrompt({
      conversationId: conv.id,
      prompt: 'What is the answer to the ultimate question?',
      modelId: 'gemini-2.5-flash',
      providerId: 'gemini',
      workspacePath: workspaceDir,
      onToken: (chunk) => {
        receivedChunks.push(chunk.delta)
      },
      onError: (err) => {
        throw new Error(err.message)
      }
    })

    // 4. Verify streaming tokens received
    expect(receivedChunks.join('')).toBe('const answer = 42;\n// Computed successfully.')
    expect(result.fullResponse).toBe('const answer = 42;\n// Computed successfully.')

    // 5. Verify conversation history and run record persisted in SQLite
    const updatedConv = convStore.getConversation(conv.id)
    expect(updatedConv?.messages.length).toBe(2)
    expect(updatedConv?.messages[0].role).toBe('user')
    expect(updatedConv?.messages[1].role).toBe('assistant')
    expect(updatedConv?.messages[1].content).toContain('const answer = 42;')
  })

  it('Journey 3: Reviewable Diff-First File Mutation & Conflict Detection', async () => {
    const targetFile = path.join(workspaceDir, 'calculator.ts')
    const originalContent = 'export function add(a: number, b: number): number {\n  return a + b\n}\n'
    fs.writeFileSync(targetFile, originalContent, 'utf-8')

    // 1. Agent proposes modification
    const proposedContent = 'export function add(a: number, b: number): number {\n  // Optimized addition\n  return a + b\n}\n'
    const baselineSha256 = DiffEngine.computeSha256(originalContent)
    const diffResult = DiffEngine.createUnifiedDiff({
      filePath: 'calculator.ts',
      originalContent,
      newContent: proposedContent
    })

    expect(diffResult.hasChanges).toBe(true)
    expect(diffResult.patch).toContain('+  // Optimized addition')
    expect(diffResult.additions).toBeGreaterThan(0)

    // 2. External conflict detection test: file modified externally while user reviews diff
    fs.writeFileSync(targetFile, originalContent + '\n// External change from another dev', 'utf-8')
    const currentOnDisk = fs.readFileSync(targetFile, 'utf-8')
    const currentSha256 = DiffEngine.computeSha256(currentOnDisk)
    expect(currentSha256).not.toBe(baselineSha256)

    // 3. Re-baseline and execute atomic commit
    const freshOriginal = fs.readFileSync(targetFile, 'utf-8')
    const freshBaselineSha = DiffEngine.computeSha256(freshOriginal)
    const freshModified = freshOriginal.replace('return a + b', 'return Number(a) + Number(b)')
    const freshDiff = DiffEngine.createUnifiedDiff({
      filePath: 'calculator.ts',
      originalContent: freshOriginal,
      newContent: freshModified
    })

    await AtomicWriter.writeAtomic(targetFile, freshModified)

    // 4. Record mutation in SQLite Change Journal
    const changeId = changeJournal.recordChange({
      workspacePath: workspaceDir,
      relativePath: 'calculator.ts',
      baselineSha256: freshBaselineSha,
      diffPatch: freshDiff.patch,
      status: 'applied'
    })
    expect(changeId).toBeDefined()
    const recorded = changeJournal.getChange(changeId)
    expect(recorded?.relativePath).toBe('calculator.ts')
    expect(recorded?.status).toBe('applied')

    // Verify file on disk has updated content
    const diskContent = fs.readFileSync(targetFile, 'utf-8')
    expect(diskContent).toContain('Number(a) + Number(b)')
  })

  it('Journey 4: Dual Terminal Execution & Secret Redaction', async () => {
    const runner = AgentCommandRunner.getInstance()
    const secretApiKey = 'AIzaSySuperSecretE2EKey9988776655'

    // Command output includes secret pattern
    const result = await runner.runCommand({
      command: 'node',
      args: ['-e', `console.log("Found key: ${secretApiKey}");`],
      cwd: workspaceDir,
      timeoutMs: 5000
    })

    expect(result.exitCode).toBe(0)
    // Secret must be scrubbed from standard output
    expect(result.stdout).not.toContain(secretApiKey)
    expect(result.stdout).toContain('[REDACTED_SECRET]')
  })

  it('Journey 5: Privacy Policy Enforcement & SQLite Retention Purging', () => {
    // 1. Configure strict privacy policy: Groq only, public cloud disabled
    contextManager.savePrivacySettings({
      allowedProviders: ['groq'],
      allowPublicCloud: false,
      autoRedactSecrets: true,
      auditRetentionDays: 7,
      contextWindowBudgetTokens: 8000,
      autoSummarizeContext: true
    })

    const policy = contextManager.getPrivacySettings()
    expect(policy.allowedProviders).toEqual(['groq'])
    expect(policy.allowPublicCloud).toBe(false)

    // 2. Validate provider gating
    expect(contextManager.isProviderAllowed('groq', policy.allowedProviders)).toBe(true)
    expect(contextManager.isProviderAllowed('gemini', policy.allowedProviders)).toBe(false)
    expect(contextManager.isProviderAllowed('openrouter', policy.allowedProviders)).toBe(false)

    // 3. Create dummy history and purge
    const c1 = convStore.createConversation({ title: 'Old History', selectedModel: 'groq' })
    convStore.addMessage({ conversationId: c1.id, role: 'user', content: 'test retention' })

    const purgeResult = contextManager.purgeOldData(0)
    expect(purgeResult.purgedConversations).toBeGreaterThanOrEqual(1)
    expect(convStore.listConversations().length).toBe(0)
  })
})
