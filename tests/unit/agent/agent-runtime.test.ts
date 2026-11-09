import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AgentRuntime } from '../../../src/main/agent/agent-runtime'
import { ProviderRegistry } from '../../../src/main/providers/provider-registry'
import { SecretStorageService } from '../../../src/main/security/safe-storage.service'
import { ConversationStore } from '../../../src/main/storage/conversation-store'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('AgentRuntime Streaming & Cancellation', () => {
  let tempDir: string
  let dbPath: string
  let runtime: AgentRuntime
  let registry: ProviderRegistry
  let secretStore: SecretStorageService

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-agent-test-'))
    dbPath = path.join(tempDir, 'test-agent.db')

    // Reset singletons for testing
    // @ts-expect-error Reset singleton
    SqliteDatabase.instance = null
    // @ts-expect-error Reset singleton
    ConversationStore.instance = null
    // @ts-expect-error Reset singleton
    SecretStorageService.instance = null
    // @ts-expect-error Reset singleton
    AgentRuntime.instance = null

    const db = SqliteDatabase.getInstance(dbPath)
    db.runMigrations()

    secretStore = SecretStorageService.getInstance(path.join(tempDir, 'secrets.json'))
    registry = ProviderRegistry.getInstance()
    runtime = AgentRuntime.getInstance()

    // Save a mock credential
    await secretStore.saveCredential({
      id: 'mock-gemini-cred',
      providerId: 'gemini',
      label: 'Gemini Key',
      apiKey: 'AIzaSyMockKeyForRuntimeTest'
    })
  })

  afterEach(() => {
    try {
      const db = SqliteDatabase.getInstance()
      db.close()
    } catch {
      // Ignore
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('streams tokens sequentially and records completion in conversation history', async () => {
    const mockAdapter = {
      id: 'gemini' as const,
      name: 'Google AI Studio',
      validateKey: vi.fn(),
      listModels: vi.fn(),
      streamCompletion: async function* () {
        yield { textDelta: 'Hello ' }
        yield { textDelta: 'developer! ' }
        yield { textDelta: 'How can I assist?' }
      }
    }

    vi.spyOn(registry, 'getAdapter').mockReturnValue(mockAdapter as any)

    const receivedDeltas: string[] = []
    let isCompleted = false

    const result = await runtime.executePrompt({
      conversationId: 'conv-runtime-1',
      prompt: 'Hello AI',
      modelId: 'gemini-2.5-flash',
      providerId: 'gemini',
      onToken: (chunk) => {
        if (chunk.delta) receivedDeltas.push(chunk.delta)
        if (chunk.isComplete) isCompleted = true
      },
      onError: () => { }
    })

    expect(result.fullResponse).toBe('Hello developer! How can I assist?')
    expect(receivedDeltas).toEqual(['Hello ', 'developer! ', 'How can I assist?'])
    expect(isCompleted).toBe(true)

    // Verify messages saved to database
    const convStore = ConversationStore.getInstance()
    const history = convStore.getConversation('conv-runtime-1')
    expect(history?.messages.length).toBe(2)
    expect(history?.messages[0].content).toBe('Hello AI')
    expect(history?.messages[1].content).toBe('Hello developer! How can I assist?')
  })

  it('supports cancellation mid-stream via cancelRun', async () => {
    let iterationCount = 0

    const mockAdapter = {
      id: 'gemini' as const,
      name: 'Google AI Studio',
      validateKey: vi.fn(),
      listModels: vi.fn(),
      streamCompletion: async function* (req: any) {
        for (let i = 0; i < 10; i++) {
          if (req.signal?.aborted) {
            throw new Error('Generation cancelled by user')
          }
          iterationCount++
          yield { textDelta: `Token ${i} ` }
          // Small pause to allow cancel signal to land
          await new Promise((r) => setTimeout(r, 10))
        }
      }
    }

    vi.spyOn(registry, 'getAdapter').mockReturnValue(mockAdapter as any)

    // Trigger prompt
    const promptPromise = runtime.executePrompt({
      conversationId: 'conv-cancel-test',
      prompt: 'Infinite tokens please',
      modelId: 'gemini-2.5-flash',
      providerId: 'gemini',
      onToken: (chunk) => {
        // Trigger cancel on second chunk
        if (chunk.runId) {
          runtime.cancelRun(chunk.runId)
        }
      },
      onError: () => { }
    })

    await expect(promptPromise).rejects.toThrow('Generation cancelled by user')
    expect(iterationCount).toBeLessThan(10)
  })

  it('executes multi-turn tool calling without prematurely signaling isComplete and feeds tool output back to model', async () => {
    // Create a dummy workspace file
    const workspaceDir = path.join(tempDir, 'workspace')
    fs.mkdirSync(workspaceDir, { recursive: true })
    fs.writeFileSync(path.join(workspaceDir, 'test.txt'), 'Secret content in file', 'utf-8')

    let turn = 0
    const mockAdapter = {
      id: 'gemini' as const,
      name: 'Google AI Studio',
      validateKey: vi.fn(),
      listModels: vi.fn(),
      streamCompletion: async function* () {
        turn++
        if (turn === 1) {
          // Turn 1: model returns tool call to read_file
          yield {
            toolCallsDelta: [
              { index: 0, id: 'call_1', name: 'read_file', arguments: '{"path":"test.txt"}' }
            ]
          }
        } else {
          // Turn 2: model answers based on tool output
          yield { textDelta: 'The file contains: Secret content in file' }
        }
      }
    }

    vi.spyOn(registry, 'getAdapter').mockReturnValue(mockAdapter as any)

    const receivedChunks: Array<{ delta: string; isComplete: boolean }> = []

    const result = await runtime.executePrompt({
      conversationId: 'conv-tool-test',
      prompt: 'What is inside test.txt?',
      modelId: 'gemini-2.5-flash',
      providerId: 'gemini',
      workspacePath: workspaceDir,
      onToken: (chunk) => {
        receivedChunks.push({ delta: chunk.delta, isComplete: chunk.isComplete })
      },
      onError: () => {}
    })

    expect(result.fullResponse).toBe('The file contains: Secret content in file')
    expect(turn).toBe(2)

    // Check that isComplete is ONLY true on the very last chunk!
    const completedChunks = receivedChunks.filter((c) => c.isComplete)
    expect(completedChunks.length).toBe(1)
    expect(receivedChunks[receivedChunks.length - 1].isComplete).toBe(true)

    // Check that intermediate chunks showed tool execution action and output
    const combinedDelta = receivedChunks.map((c) => c.delta).join('')
    expect(combinedDelta).toContain('Executing tool `read_file`')
    expect(combinedDelta).toContain('Output:** Execution succeeded')
    expect(combinedDelta).toContain('The file contains: Secret content in file')

    // Check that conversation history in SQLite stored the complete tool action and answer
    const convStore = ConversationStore.getInstance()
    const history = convStore.getConversation('conv-tool-test')
    expect(history?.messages.length).toBe(2)
    expect(history?.messages[1].content).toContain('Executing tool `read_file`')
    expect(history?.messages[1].content).toContain('The file contains: Secret content in file')
  })

  it('persists assistant error response to SQLite when generation fails', async () => {
    const mockAdapter = {
      id: 'gemini' as const,
      name: 'Google AI Studio',
      validateKey: vi.fn(),
      listModels: vi.fn(),
      streamCompletion: async function* () {
        throw new Error('Upstream Router error HTTP 400: Model not supported')
      }
    }

    vi.spyOn(registry, 'getAdapter').mockReturnValue(mockAdapter as any)

    let errorReceived = ''
    try {
      await runtime.executePrompt({
        conversationId: 'conv-error-persist-test',
        prompt: 'Trigger an error',
        modelId: 'gemini-2.5-flash',
        providerId: 'gemini',
        onToken: () => {},
        onError: (err) => {
          errorReceived = err.message
        }
      })
    } catch {
      // Expected rejection
    }

    expect(errorReceived).toContain('Upstream Router error HTTP 400: Model not supported')

    // Verify both user message AND assistant error message exist in SQLite
    const convStore = ConversationStore.getInstance()
    const history = convStore.getConversation('conv-error-persist-test')
    expect(history?.messages.length).toBe(2)
    expect(history?.messages[0].role).toBe('user')
    expect(history?.messages[0].content).toBe('Trigger an error')
    expect(history?.messages[1].role).toBe('assistant')
    expect(history?.messages[1].content).toContain('Upstream Router error HTTP 400: Model not supported')
  })
})
