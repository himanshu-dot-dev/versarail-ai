import { ProviderId, ModelDescriptorDTO } from '@shared/domain/models'
import {
  IProviderAdapter,
  KeyValidationResult,
  ChatCompletionRequest,
  StreamChunk
} from './provider-adapter.interface'
import { detectInBandError } from './utils/in-band-detector'
import { repairToolArguments } from './utils/tool-repair'

export interface OpenAICompatConfig {
  id: ProviderId
  name: string
  defaultBaseUrl: string
  defaultModels: ModelDescriptorDTO[]
}

export class OpenAICompatAdapter implements IProviderAdapter {
  readonly id: ProviderId
  readonly name: string
  protected defaultBaseUrl: string
  protected defaultModels: ModelDescriptorDTO[]

  constructor(config: OpenAICompatConfig) {
    this.id = config.id
    this.name = config.name
    this.defaultBaseUrl = config.defaultBaseUrl
    this.defaultModels = config.defaultModels
  }

  protected getBaseUrl(customEndpoint?: string): string {
    if (customEndpoint && customEndpoint.trim().length > 0) {
      return customEndpoint.trim().replace(/\/+$/, '')
    }
    return this.defaultBaseUrl.replace(/\/+$/, '')
  }

  async validateKey(apiKey: string, customEndpoint?: string): Promise<KeyValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, latencyMs: 0, modelsCount: 0, error: 'API key is required' }
    }

    const baseUrl = this.getBaseUrl(customEndpoint)
    const url = `${baseUrl}/models`
    const startTime = performance.now()

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'User-Agent': 'VersaRail-AI-Agent-Harness/0.1.0'
        },
        signal: AbortSignal.timeout(10000)
      })

      const latencyMs = Math.round(performance.now() - startTime)

      if (response.ok) {
        let modelsCount = this.defaultModels.length
        try {
          const body = (await response.json()) as { data?: unknown[] }
          if (Array.isArray(body?.data)) {
            modelsCount = body.data.length
          }
        } catch {
          // Keep default count if JSON parse fails
        }

        return { valid: true, latencyMs, modelsCount }
      }

      if (response.status === 401) {
        return { valid: false, latencyMs, modelsCount: 0, error: 'Invalid API Key (HTTP 401 Unauthorized)' }
      }

      if (response.status === 403) {
        return { valid: false, latencyMs, modelsCount: 0, error: 'Access forbidden for this credential tier (HTTP 403)' }
      }

      if (response.status === 429) {
        return { valid: false, latencyMs, modelsCount: 0, error: 'Rate limit or quota exceeded (HTTP 429)' }
      }

      return {
        valid: false,
        latencyMs,
        modelsCount: 0,
        error: `Endpoint returned HTTP status ${response.status}: ${response.statusText}`
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

  async listModels(apiKey: string, customEndpoint?: string): Promise<ModelDescriptorDTO[]> {
    const baseUrl = this.getBaseUrl(customEndpoint)
    const url = `${baseUrl}/models`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'User-Agent': 'VersaRail-AI-Agent-Harness/0.1.0'
        },
        signal: AbortSignal.timeout(6000)
      })

      if (response.ok) {
        const body = (await response.json()) as { data?: Array<{ id: string }> }
        if (Array.isArray(body?.data) && body.data.length > 0) {
          const remoteModelIds = new Set(body.data.map((m) => m.id))
          // Filter curated list or map dynamically
          const matched = this.defaultModels.filter((m) => remoteModelIds.has(m.id))
          if (matched.length > 0) return matched
        }
      }
    } catch {
      // Fallback to default models
    }

    return this.defaultModels
  }

  async *streamCompletion(request: ChatCompletionRequest): AsyncIterable<StreamChunk> {
    const baseUrl = this.getBaseUrl(request.customEndpoint)
    const url = `${baseUrl}/chat/completions`

    const payload = {
      model: request.model,
      messages: request.messages,
      stream: true,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.apiKey.trim()}`,
        'User-Agent': 'VersaRail-AI-Agent-Harness/0.1.0'
      },
      body: JSON.stringify(payload),
      signal: request.signal
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Upstream ${this.name} error HTTP ${response.status}: ${errText || response.statusText}`)
    }

    if (!response.body) {
      throw new Error(`Upstream ${this.name} returned an empty response body`)
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
          if (trimmed === 'data: [DONE]') return

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6)
            try {
              const parsed = JSON.parse(jsonStr)
              const choice = parsed.choices?.[0]
              const delta = choice?.delta

              if (delta?.content) {
                // In-band anomaly check on first chunk
                if (isFirstChunk) {
                  isFirstChunk = false
                  const inBandErr = detectInBandError(delta.content)
                  if (inBandErr) {
                    throw new Error(`In-band provider error detected: ${inBandErr}`)
                  }
                }

                yield {
                  textDelta: delta.content,
                  finishReason: choice?.finish_reason
                }
              }

              if (delta?.tool_calls) {
                const toolCalls = delta.tool_calls.map((tc: any) => ({
                  id: tc.id,
                  name: tc.function?.name,
                  arguments: tc.function?.arguments ? repairToolArguments(tc.function.arguments) : undefined
                }))

                yield {
                  toolCallsDelta: toolCalls,
                  finishReason: choice?.finish_reason
                }
              }

              if (parsed.usage) {
                yield {
                  usage: {
                    promptTokens: parsed.usage.prompt_tokens,
                    completionTokens: parsed.usage.completion_tokens
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

