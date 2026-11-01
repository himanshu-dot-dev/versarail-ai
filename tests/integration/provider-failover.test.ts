import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AgentRuntime } from '../../src/main/agent/agent-runtime'
import { ProviderRegistry } from '../../src/main/providers/provider-registry'
import { SecretStorageService } from '../../src/main/security/safe-storage.service'
import { ConversationStore } from '../../src/main/storage/conversation-store'
import { SqliteDatabase } from '../../src/main/storage/sqlite-database'
import { FailoverEngine, FailoverEvent } from '../../src/main/agent/failover-engine'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('Provider Auto-Failover Integration & Dead-Turn Recovery', () => {
  let tempDir: string
  let dbPath: string
  let runtime: AgentRuntime
  let registry: ProviderRegistry
  let secretStore: SecretStorageService

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-failover-test-'))
    dbPath = path.join(tempDir, 'test-failover.db')

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

    // Configure credentials for both Groq and Gemini
    await secretStore.saveCredential({
      id: 'cred-groq',
      providerId: 'groq',
      label: 'Groq Cloud',
      apiKey: 'gsk_mockGroqKeyForFailover123456789012345678901234567890'
    })

    await secretStore.saveCredential({
      id: 'cred-gemini',
      providerId: 'gemini',
      label: 'Google AI Studio',
      apiKey: 'AIzaSyMockGeminiKeyForFailover12345678901234567'
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

  it('performs transparent dead-turn failover from Groq (429) to Gemini pre-first-byte', async () => {
    // Mock Groq adapter to throw 429 on stream start
    const mockGroqAdapter = {
      id: 'groq' as const,
      name: 'GroqCloud LPU',
      validateKey: vi.fn(),
      listModels: vi.fn(),
      streamCompletion: async function* () {
        const error: any = new Error('Rate limit reached on requests per minute (RPM). Please try again in 45s.')
        error.status = 429
        throw error
      }
    }

    // Mock Gemini adapter to succeed
    const mockGeminiAdapter = {
      id: 'gemini' as const,
      name: 'Google AI Studio',
      validateKey: vi.fn(),
      listModels: vi.fn(),
      streamCompletion: async function* () {
        yield { textDelta: 'Gemini fallback response arrived successfully.' }
      }
    }

    vi.spyOn(registry, 'getAdapter').mockImplementation((id) => {
      if (id === 'groq') return mockGroqAdapter as any
      if (id === 'gemini') return mockGeminiAdapter as any
      return undefined
    })

    const failoverEvents: FailoverEvent[] = []
    const receivedDeltas: string[] = []

    const result = await runtime.executePrompt({
      conversationId: 'conv-failover-1',
      prompt: 'Refactor this algorithm',
      modelId: 'llama-3.3-70b-versatile',
      providerId: 'groq',
      onToken: (chunk) => {
        if (chunk.delta) receivedDeltas.push(chunk.delta)
      },
      onFailover: (ev) => {
        failoverEvents.push(ev)
      },
      onError: () => {}
    })

    // 1. Verify result completed with Gemini fallback
    expect(result.fullResponse).toBe('Gemini fallback response arrived successfully.')
    expect(receivedDeltas).toEqual(['Gemini fallback response arrived successfully.'])

    // 2. Verify failover event was emitted as silent
    expect(failoverEvents.length).toBe(1)
    expect(failoverEvents[0].fromProvider).toBe('groq')
    expect(failoverEvents[0].toProvider).toBe('gemini')
    expect(failoverEvents[0].isSilent).toBe(true)
    expect(failoverEvents[0].resetEta).toBe('~45s')

    // 3. Verify Groq credential was placed in cooldown
    const cooldown = registry.getCooldownExpiry('cred-groq')
    expect(cooldown).not.toBeNull()
    expect(cooldown! > Date.now()).toBe(true)

    // 4. Verify conversation store reflects final provider
    const convStore = ConversationStore.getInstance()
    const conv = convStore.getConversation('conv-failover-1')
    expect(conv?.messages.length).toBe(2)
    expect(conv?.messages[1].content).toBe('Gemini fallback response arrived successfully.')
  })

  it('prohibits silent failover after first byte has already rendered (prevents corrupting output)', async () => {
    // Mock Groq adapter to yield partial token then crash
    const mockGroqAdapter = {
      id: 'groq' as const,
      name: 'GroqCloud LPU',
      validateKey: vi.fn(),
      listModels: vi.fn(),
      streamCompletion: async function* () {
        yield { textDelta: 'Partial response already seen by user... ' }
        const err: any = new Error('Connection terminated mid-stream')
        err.status = 503
        throw err
      }
    }

    vi.spyOn(registry, 'getAdapter').mockImplementation((id) => {
      if (id === 'groq') return mockGroqAdapter as any
      return undefined
    })

    const failoverEvents: FailoverEvent[] = []
    let thrownError: any = null

    try {
      await runtime.executePrompt({
        conversationId: 'conv-failover-2',
        prompt: 'Generate code',
        modelId: 'llama-3.3-70b-versatile',
        providerId: 'groq',
        onToken: () => {},
        onFailover: (ev) => {
          failoverEvents.push(ev)
        },
        onError: (err) => {
          thrownError = err
        }
      })
    } catch {
      // Expected rejection
    }

    expect(thrownError).not.toBeNull()
    expect(thrownError.message).toContain('Stream interrupted after partial response from groq')

    // Verify failover event was emitted as NOT silent
    expect(failoverEvents.length).toBe(1)
    expect(failoverEvents[0].isSilent).toBe(false)
  })

  it('skips models failing pre-flight context window floor check', () => {
    const failoverEngine = runtime['failoverEngine']

    // Context floor test: Mixtral 8x7B (32k context) vs prompt requiring 40k tokens
    const candidates = failoverEngine.getCandidateModels({
      preferredProviderId: 'groq',
      preferredModelId: 'llama-3.3-70b-versatile',
      estimatedPromptTokens: 40000 // 40k tokens prompt
    })

    // Groq's llama-3.3-70b has 128k context, Gemini has 1M context
    // Both fit 40k tokens!
    for (const c of candidates) {
      expect(c.contextWindow).toBeGreaterThan(40000)
    }
  })

  it('does not lock out secondary models sharing the same credential when the primary model fails with quota exhaustion', async () => {
    // Add custom gateway credential
    await secretStore.saveCredential({
      id: 'cred-custom-test',
      providerId: 'custom',
      label: 'OmniRoute Gateway',
      apiKey: 'sk-mockCustomOmniRouteKey12345678901234567890',
      customEndpoint: 'http://localhost:20128/v1'
    })

    const customAdapter = registry.getAdapter('custom')
    expect(customAdapter).toBeDefined()

    // Mock customAdapter streamCompletion: fail for auto/best-coding, succeed for auto/gpt
    vi.spyOn(customAdapter!, 'streamCompletion').mockImplementation((options: any) => {
      if (options.model === 'auto/best-coding') {
        return (async function* () {
          const err: any = new Error('CUSTOM quota or credit limit exhausted. Please top up your account.')
          err.status = 429
          throw err
        })()
      }
      if (options.model === 'auto/gpt') {
        return (async function* () {
          yield { textDelta: 'Hello from auto/gpt! How can I help?' }
        })()
      }
      return (async function* () {
        yield { textDelta: 'Fallback default' }
      })()
    })

    const failoverEngine = runtime['failoverEngine']
    const candidates = [
      {
        providerId: 'custom' as const,
        modelId: 'auto/best-coding',
        credentialId: 'cred-custom-test',
        contextWindow: 128000,
        outputLimit: 4096,
        supportsTools: true
      },
      {
        providerId: 'custom' as const,
        modelId: 'auto/gpt',
        credentialId: 'cred-custom-test',
        contextWindow: 128000,
        outputLimit: 4096,
        supportsTools: true
      }
    ]

    const receivedTokens: string[] = []
    const failoverEvents: FailoverEvent[] = []

    // 1. Initial execution requesting auto/best-coding
    const result = await failoverEngine.executeStreaming({
      runId: 'run-custom-test-1',
      candidates,
      messages: [{ role: 'user', content: 'test prompt' }],
      preferredProviderId: 'custom',
      preferredModelId: 'auto/best-coding',
      onToken: (chunk) => {
        if (chunk.delta) receivedTokens.push(chunk.delta)
      },
      onFailover: (ev) => {
        failoverEvents.push(ev)
      }
    })

    // Failover should seamlessly succeed using auto/gpt without throwing exhausted error!
    expect(result.finalModelId).toBe('auto/gpt')
    expect(result.fullResponse).toBe('Hello from auto/gpt! How can I help?')
    expect(result.wasFailoverTriggered).toBe(true)
    expect(failoverEvents.length).toBe(1)
    expect(failoverEvents[0].fromModel).toBe('auto/best-coding')
    expect(failoverEvents[0].toModel).toBe('auto/gpt')

    // 2. Subsequent execution directly requesting auto/gpt should work immediately
    const gptCandidates = [candidates[1], candidates[0]]
    const result2 = await failoverEngine.executeStreaming({
      runId: 'run-custom-test-2',
      candidates: gptCandidates,
      messages: [{ role: 'user', content: 'hello again' }],
      preferredProviderId: 'custom',
      preferredModelId: 'auto/gpt',
      onToken: () => {}
    })

    expect(result2.finalModelId).toBe('auto/gpt')
    expect(result2.fullResponse).toBe('Hello from auto/gpt! How can I help?')
    expect(result2.wasFailoverTriggered).toBe(false)
  })

  it('filters out disabled credentials from failover candidate list', async () => {
    const db = SqliteDatabase.getInstance()
    // Insert Groq as disabled in provider_metadata
    db.prepare(`
      INSERT INTO provider_metadata (id, provider_id, label, custom_endpoint, enabled, health_status, created_at)
      VALUES ('cred-groq', 'groq', 'Groq Cloud', null, 0, 'healthy', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET enabled = 0
    `).run()

    const failoverEngine = runtime['failoverEngine']

    // Request with Gemini as preferred: Groq should NOT be among the fallback candidates because it is disabled
    const candidates = failoverEngine.getCandidateModels({
      preferredProviderId: 'gemini',
      preferredModelId: 'gemini-2.5-flash'
    })

    const groqCandidate = candidates.find((c) => c.providerId === 'groq')
    expect(groqCandidate).toBeUndefined()

    // But if the user explicitly prefers Groq, it is still included
    const userExplicitCandidates = failoverEngine.getCandidateModels({
      preferredProviderId: 'groq',
      preferredModelId: 'llama-3.3-70b-versatile'
    })
    const userGroq = userExplicitCandidates.find((c) => c.providerId === 'groq')
    expect(userGroq).toBeDefined()
  })
})
