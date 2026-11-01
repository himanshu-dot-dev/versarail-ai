import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiAdapter } from '../../../src/main/providers/gemini.adapter'
import { GroqAdapter } from '../../../src/main/providers/groq.adapter'
import { OpenAICompatAdapter } from '../../../src/main/providers/openai-compat.adapter'
import { ProviderRegistry } from '../../../src/main/providers/provider-registry'

describe('Provider Adapters & Registry Architecture', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('GeminiAdapter', () => {
    const adapter = new GeminiAdapter()

    it('returns valid on HTTP 200 model list', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: 'models/gemini-2.5-flash' }, { name: 'models/gemini-2.5-pro' }]
        })
      } as any)

      const result = await adapter.validateKey('AIzaSyDummyValidKey')
      expect(result.valid).toBe(true)
      expect(result.modelsCount).toBe(2)
      expect(typeof result.latencyMs).toBe('number')
    })

    it('returns invalid on HTTP 400 API_KEY_INVALID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'API key not valid. Please pass a valid API key.' }
        })
      } as any)

      const result = await adapter.validateKey('AIzaSyInvalidKey')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('API key not valid')
    })

    it('handles HTTP 429 quota exhaustion', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({})
      } as any)

      const result = await adapter.validateKey('AIzaSyRateLimited')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Quota or rate limit reached')
    })
  })

  describe('GroqAdapter (OpenAI-Compatible)', () => {
    const adapter = new GroqAdapter()

    it('returns valid on HTTP 200 models endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'llama-3.3-70b-versatile' }, { id: 'llama-3.1-8b-instant' }]
        })
      } as any)

      const result = await adapter.validateKey('gsk_validKey')
      expect(result.valid).toBe(true)
      expect(result.modelsCount).toBe(2)
    })

    it('returns invalid on HTTP 401 unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as any)

      const result = await adapter.validateKey('gsk_invalidKey')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('HTTP 401 Unauthorized')
    })
  })

  describe('OpenAICompatAdapter (Custom Gateways & Dynamic Discovery)', () => {
    it('dynamically maps remote models when defaultModels is empty', async () => {
      const customAdapter = new OpenAICompatAdapter({
        id: 'custom',
        name: 'Custom Gateway',
        defaultBaseUrl: 'http://localhost:20128/v1',
        defaultModels: []
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'custom-model-alpha', context_length: 64000, max_output_tokens: 4096 },
            { id: 'custom-model-beta' }
          ]
        })
      } as any)

      const models = await customAdapter.listModels('sk-dummy-key')
      expect(models.length).toBe(2)
      expect(models[0].id).toBe('custom-model-alpha')
      expect(models[0].contextWindow).toBe(64000)
      expect(models[0].outputLimit).toBe(4096)
      expect(models[1].id).toBe('custom-model-beta')
      expect(models[1].contextWindow).toBe(128000) // fallback default
      expect(models[1].outputLimit).toBe(8192) // fallback default
    })

    it('respects customEndpoint parameter when listing models', async () => {
      const customAdapter = new OpenAICompatAdapter({
        id: 'custom',
        name: 'Custom Gateway',
        defaultBaseUrl: 'http://localhost:20128/v1',
        defaultModels: []
      })

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'omniroute-llama-3' }]
        })
      } as any)
      global.fetch = fetchMock

      await customAdapter.listModels('sk-omni-key', 'http://127.0.0.1:8080/v1')
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:8080/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-omni-key'
          })
        })
      )
    })

    it('safely handles Buffer or non-string apiKey without throwing apiKey.trim error', async () => {
      const customAdapter = new OpenAICompatAdapter({
        id: 'custom',
        name: 'Custom Gateway',
        defaultBaseUrl: 'http://localhost:20128/v1',
        defaultModels: []
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'model-1' }]
        })
      } as any)

      // Pass Buffer as key (such as returned by DPAPI safeStorage decrypt)
      const bufferKey = Buffer.from('sk-test-buffer-key')
      const result = await customAdapter.validateKey(bufferKey as unknown as string)
      expect(result.valid).toBe(true)
      expect(result.modelsCount).toBe(1)
    })

    it('unpacks Electron decryptStringAsync object payload { result: string }', async () => {
      const customAdapter = new OpenAICompatAdapter({
        id: 'custom',
        name: 'Custom Gateway',
        defaultBaseUrl: 'http://localhost:20128/v1',
        defaultModels: []
      })

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'model-omni' }]
        })
      } as any)
      global.fetch = fetchMock

      // Electron 45 safeStorage.decryptStringAsync return shape
      const electronObj = { shouldReEncrypt: false, result: 'sk-async-unwrapped-key' }
      const result = await customAdapter.validateKey(electronObj as unknown as string)
      expect(result.valid).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:20128/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-async-unwrapped-key'
          })
        })
      )
    })

    it('throws error when SSE stream contains an upstream error object payload', async () => {
      const customAdapter = new OpenAICompatAdapter({
        id: 'custom',
        name: 'Custom Gateway',
        defaultBaseUrl: 'http://localhost:20128/v1',
        defaultModels: []
      })

      const sseStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"error":{"message":"Free usage limit reached (HTTP 429)","type":"rate_limit_error"}}\n\n'
            )
          )
          controller.close()
        }
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: sseStream
      } as any)

      const stream = customAdapter.streamCompletion(
        {
          model: 'auto/best-coding',
          messages: [{ role: 'user', content: 'hi' }]
        },
        'sk-test'
      )

      await expect(async () => {
        for await (const _ of stream) {
          // should throw
        }
      }).rejects.toThrow('Upstream Custom Gateway error: Free usage limit reached (HTTP 429)')
    })
  })

  describe('ProviderRegistry & Concurrency Leases', () => {
    const registry = ProviderRegistry.getInstance()

    it('has all canonical adapters registered', () => {
      expect(registry.getAdapter('gemini')).toBeDefined()
      expect(registry.getAdapter('groq')).toBeDefined()
      expect(registry.getAdapter('cerebras')).toBeDefined()
      expect(registry.getAdapter('openrouter')).toBeDefined()
      expect(registry.getAdapter('custom')).toBeDefined()
    })

    it('acquires and releases concurrency leases up to limit', () => {
      const credId = 'test-cred-lease'
      const maxLimit = 2

      // 1st request -> success
      expect(registry.acquireLease(credId, maxLimit)).toBe(true)
      // 2nd request -> success
      expect(registry.acquireLease(credId, maxLimit)).toBe(true)
      // 3rd request -> rejected (max reached)
      expect(registry.acquireLease(credId, maxLimit)).toBe(false)

      // Release one request
      registry.releaseLease(credId)
      // Now 3rd request can acquire!
      expect(registry.acquireLease(credId, maxLimit)).toBe(true)

      // Clean up
      registry.releaseLease(credId)
      registry.releaseLease(credId)
    })

    it('evaluates pre-flight context window floor correctly', () => {
      const model = {
        id: 'llama-small',
        providerId: 'groq' as const,
        name: 'Small Model',
        contextWindow: 8192,
        outputLimit: 4096,
        supportsTools: true,
        supportsStreaming: true,
        isFreeTierAvailable: true
      }

      // 2,000 token prompt fits in 8k model
      expect(registry.passesContextWindowFloor(2000, model)).toBe(true)

      // 10,000 token prompt exceeds 8k model (8192 - 4096 = 4096 max usable)
      expect(registry.passesContextWindowFloor(10000, model)).toBe(false)
    })
  })
})

