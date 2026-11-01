import { ProviderId, ModelDescriptorDTO } from '@shared/domain/models'
import {
  IProviderAdapter,
  KeyValidationResult,
  ChatCompletionRequest,
  StreamChunk
} from './provider-adapter.interface'
import { detectInBandError } from './utils/in-band-detector'

const GEMINI_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'gemini-2.5-flash',
    providerId: 'gemini',
    name: 'Gemini 2.5 Flash',
    contextWindow: 1000000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'gemini-2.5-pro',
    providerId: 'gemini',
    name: 'Gemini 2.5 Pro',
    contextWindow: 2000000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'gemini-2.0-flash',
    providerId: 'gemini',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1000000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

function sanitizeGeminiKey(rawApiKey: unknown): string {
  if (!rawApiKey) return ''
  let key = ''
  if (typeof rawApiKey === 'object' && rawApiKey !== null && 'result' in rawApiKey) {
    const res = (rawApiKey as { result: unknown }).result
    key = Buffer.isBuffer(res) ? res.toString('utf-8') : String(res ?? '')
  } else if (Buffer.isBuffer(rawApiKey)) {
    key = (rawApiKey as Buffer).toString('utf-8')
  } else {
    key = typeof rawApiKey === 'string' ? rawApiKey : String(rawApiKey || '')
  }
  return key.trim()
}

export class GeminiAdapter implements IProviderAdapter {
  readonly id: ProviderId = 'gemini'
  readonly name = 'Google AI Studio'
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  async validateKey(rawApiKey: string, customEndpoint?: string): Promise<KeyValidationResult> {
    const apiKey = sanitizeGeminiKey(rawApiKey)

    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, latencyMs: 0, modelsCount: 0, error: 'API key is required' }
    }

    const endpoint = (customEndpoint && customEndpoint.trim().length > 0) ? customEndpoint.trim() : this.baseUrl
    const url = `${endpoint}/models?key=${apiKey.trim()}`
    const startTime = performance.now()

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'VersaRail-AI-Agent-Harness/0.1.0'
        },
        signal: AbortSignal.timeout(10000)
      })

      const latencyMs = Math.round(performance.now() - startTime)

      if (response.ok) {
        let modelsCount = GEMINI_DEFAULT_MODELS.length
        try {
          const body = (await response.json()) as { models?: Array<{ name: string }> }
          if (Array.isArray(body?.models)) {
            modelsCount = body.models.length
          }
        } catch {
          // Keep default
        }

        return { valid: true, latencyMs, modelsCount }
      }

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        let errMessage = 'Invalid API key or unauthorized project (HTTP ' + response.status + ')'
        try {
          const errBody = (await response.json()) as { error?: { message?: string } }
          if (errBody?.error?.message) {
            errMessage = errBody.error.message
          }
        } catch {
          // Keep default
        }
        return { valid: false, latencyMs, modelsCount: 0, error: errMessage }
      }

      if (response.status === 429) {
        return { valid: false, latencyMs, modelsCount: 0, error: 'Quota or rate limit reached (HTTP 429)' }
      }

      return {
        valid: false,
        latencyMs,
        modelsCount: 0,
        error: `Google API returned HTTP status ${response.status}: ${response.statusText}`
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime)
      return {
        valid: false,
        latencyMs,
        modelsCount: 0,
        error: err.name === 'TimeoutError' ? 'Connection timed out after 10s' : (err.message || 'Network connection failed')
      }
    }
  }

  async listModels(rawApiKey: string, customEndpoint?: string): Promise<ModelDescriptorDTO[]> {
    const apiKey = typeof rawApiKey === 'string'
      ? rawApiKey
      : Buffer.isBuffer(rawApiKey)
      ? (rawApiKey as Buffer).toString('utf-8')
      : String(rawApiKey || '')

    const endpoint = (customEndpoint && customEndpoint.trim().length > 0) ? customEndpoint.trim() : this.baseUrl
    const url = `${endpoint}/models?key=${apiKey.trim()}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'VersaRail-AI-Agent-Harness/0.1.0'
        },
        signal: AbortSignal.timeout(6000)
      })

      if (response.ok) {
        const body = (await response.json()) as { models?: Array<{ name: string }> }
        if (Array.isArray(body?.models)) {
          const names = new Set(body.models.map((m) => m.name.replace(/^models\//, '')))
          const matched = GEMINI_DEFAULT_MODELS.filter((m) => names.has(m.id))
          if (matched.length > 0) return matched
        }
      }
    } catch {
      // Fallback
    }

    return GEMINI_DEFAULT_MODELS
  }

  async *streamCompletion(request: ChatCompletionRequest): AsyncIterable<StreamChunk> {
    const apiKey = typeof request.apiKey === 'string'
      ? request.apiKey
      : Buffer.isBuffer(request.apiKey)
      ? (request.apiKey as Buffer).toString('utf-8')
      : String(request.apiKey || '')

    const endpoint = (request.customEndpoint && request.customEndpoint.trim().length > 0)
      ? request.customEndpoint.trim()
      : this.baseUrl

    // Format Gemini contents
    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const modelName = request.model.replace(/^models\//, '')
    const url = `${endpoint}/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`

    const payload = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 8192
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VersaRail-AI-Agent-Harness/0.1.0'
      },
      body: JSON.stringify(payload),
      signal: request.signal
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Upstream Gemini error HTTP ${response.status}: ${errText || response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Gemini API returned an empty response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let isFirstChunk = true

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6)
            try {
              const parsed = JSON.parse(jsonStr)
              const candidate = parsed.candidates?.[0]
              const text = candidate?.content?.parts?.[0]?.text

              if (text) {
                if (isFirstChunk) {
                  isFirstChunk = false
                  const inBandErr = detectInBandError(text)
                  if (inBandErr) {
                    throw new Error(`In-band provider error detected: ${inBandErr}`)
                  }
                }

                yield {
                  textDelta: text,
                  finishReason: candidate?.finishReason
                }
              }

              if (parsed.usageMetadata) {
                yield {
                  usage: {
                    promptTokens: parsed.usageMetadata.promptTokenCount || 0,
                    completionTokens: parsed.usageMetadata.candidatesTokenCount || 0
                  }
                }
              }
            } catch (err: any) {
              if (err.message?.includes('In-band provider error')) throw err
              // Ignore single malformed chunk parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}

