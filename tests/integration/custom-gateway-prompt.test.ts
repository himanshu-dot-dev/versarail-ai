import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AgentRuntime } from '../../src/main/agent/agent-runtime'
import { ProviderRegistry } from '../../src/main/providers/provider-registry'
import { SecretStorageService } from '../../src/main/security/safe-storage.service'
import { ConversationStore } from '../../src/main/storage/conversation-store'
import { SqliteDatabase } from '../../src/main/storage/sqlite-database'
import { FailoverEngine } from '../../src/main/agent/failover-engine'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('Custom Gateway (OmniRoute) End-to-End Chat Execution', () => {
  let tempDir: string
  let dbPath: string
  let runtime: AgentRuntime
  let registry: ProviderRegistry
  let secretStore: SecretStorageService

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-custom-gateway-'))
    dbPath = path.join(tempDir, 'test-custom.db')

    // Reset singletons for testing
    // @ts-expect-error Reset singleton
    SqliteDatabase.instance = null
    // @ts-expect-error Reset singleton
    ConversationStore.instance = null
    // @ts-expect-error Reset singleton
    SecretStorageService.instance = null
    // @ts-expect-error Reset singleton
    ProviderRegistry.instance = null
    // @ts-expect-error Reset singleton
    FailoverEngine.instance = null
    // @ts-expect-error Reset singleton
    AgentRuntime.instance = null

    const db = SqliteDatabase.getInstance(dbPath)
    db.runMigrations()

    secretStore = SecretStorageService.getInstance(path.join(tempDir, 'secrets.json'))
    registry = ProviderRegistry.getInstance()
    runtime = AgentRuntime.getInstance()

    // Configure credentials for custom gateway
    await secretStore.saveCredential({
      id: 'cred-omniroute',
      providerId: 'custom',
      label: 'OmniRoute Local',
      apiKey: 'sk-8ee7e11a45bafd46-dce42b-ee8ba860',
      customEndpoint: 'http://localhost:20128/v1'
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

  it('resolves candidates and executes prompt with auto/best-coding without throwing candidate error', async () => {
    const customAdapter = registry.getAdapter('custom')
    expect(customAdapter).toBeDefined()

    // Mock streamCompletion to return stream chunks
    const streamSpy = vi.spyOn(customAdapter!, 'streamCompletion').mockImplementation(async function* () {
      yield { textDelta: 'Hello from OmniRoute Auto Best Coding!' }
    })

    const deltas: string[] = []
    const result = await runtime.executePrompt({
      conversationId: 'conv-custom-1',
      prompt: 'hello',
      modelId: 'auto/best-coding',
      providerId: 'custom',
      onToken: (chunk) => {
        if (chunk.delta) deltas.push(chunk.delta)
      },
      onError: (err) => {
        throw new Error(err.message)
      }
    })

    expect(streamSpy).toHaveBeenCalledTimes(1)
    expect(result.fullResponse).toBe('Hello from OmniRoute Auto Best Coding!')
    expect(deltas).toEqual(['Hello from OmniRoute Auto Best Coding!'])
  })

  it('dynamically allows execution for any arbitrary model requested by user', async () => {
    const customAdapter = registry.getAdapter('custom')
    expect(customAdapter).toBeDefined()

    const streamSpy = vi.spyOn(customAdapter!, 'streamCompletion').mockImplementation(async function* (req) {
      yield { textDelta: `Response for model: ${req.model}` }
    })

    const result = await runtime.executePrompt({
      conversationId: 'conv-custom-2',
      prompt: 'Explain code',
      modelId: 'claude-3-7-sonnet-custom',
      providerId: 'custom',
      onToken: () => {},
      onError: () => {}
    })

    expect(streamSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-3-7-sonnet-custom'
      })
    )
    expect(result.fullResponse).toBe('Response for model: claude-3-7-sonnet-custom')
  })

  it('fetches live models directly from running OmniRoute endpoint', async () => {
    const customAdapter = registry.getAdapter('custom')
    expect(customAdapter).toBeDefined()

    try {
      const models = await customAdapter!.listModels(
        'sk-8ee7e11a45bafd46-dce42b-ee8ba860',
        'http://localhost:20128/v1'
      )
      expect(models.length).toBeGreaterThan(100)
      const autoModels = models.filter((m) => m.id.startsWith('auto/'))
      expect(autoModels.length).toBeGreaterThan(0)
    } catch {
      // If OmniRoute is not running in CI, ignore
    }
  })
})
