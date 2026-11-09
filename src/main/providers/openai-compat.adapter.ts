import { ProviderId, ModelDescriptorDTO } from '@shared/domain/models'
import {
  IProviderAdapter,
  KeyValidationResult,
  ChatCompletionRequest,
  StreamChunk
} from './provider-adapter.interface'
import { detectInBandError } from './utils/in-band-detector'
import { ThinkTagStreamFilter } from './utils/think-tags'
import { extractRetryDelayMs } from './utils/retry-parser'

function sanitizeApiKey(rawApiKey: unknown): string {
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
  return key.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/^["']|["']$/g, '').trim()
}

export interface OpenAICompatConfig {
  id: ProviderId
  name: string
  defaultBaseUrl: string
  defaultModels: ModelDescriptorDTO[]
  keyless?: boolean
  extraHeaders?: Record<string, string>
  timeoutMs?: number
  forceSingleToolCall?: boolean
  validateUrl?: string
}

export class OpenAICompatAdapter implements IProviderAdapter {
  readonly id: ProviderId
  readonly name: string
  readonly keyless: boolean
  protected defaultBaseUrl: string
  protected defaultModels: ModelDescriptorDTO[]
  protected extraHeaders: Record<string, string>
  protected timeoutMs: number
  protected forceSingleToolCall: boolean
  protected validateUrl?: string

  constructor(config: OpenAICompatConfig) {
    this.id = config.id
    this.name = config.name
    this.keyless = config.keyless ?? false
    this.defaultBaseUrl = config.defaultBaseUrl
    this.defaultModels = config.defaultModels
    this.extraHeaders = config.extraHeaders ?? {}
    this.timeoutMs = config.timeoutMs ?? 60_000
    this.forceSingleToolCall = config.forceSingleToolCall ?? false
    this.validateUrl = config.validateUrl
  }

  protected getBaseUrl(customEndpoint?: string): string {
    const endpoint = typeof customEndpoint === 'string'
      ? customEndpoint
      : Buffer.isBuffer(customEndpoint)
        ? (customEndpoint as Buffer).toString('utf-8')
        : customEndpoint ? String(customEndpoint) : ''

    if (endpoint && endpoint.trim().length > 0) {
      return endpoint.trim().replace(/\/+$/, '')
    }
    return this.defaultBaseUrl.replace(/\/+$/, '')
  }

  async validateKey(rawApiKey: string, customEndpoint?: string): Promise<KeyValidationResult> {
    const cleanKey = sanitizeApiKey(rawApiKey)

    // Keyless providers (e.g. Pollinations, Kilo Gateway) are valid without keys
    if (this.keyless && (!cleanKey || cleanKey === 'no-key')) {
      const baseUrl = this.getBaseUrl(customEndpoint)
      const url = this.validateUrl || `${baseUrl}/models`
      const startTime = performance.now()
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 VersaRail-AI-Agent-Harness/0.1.0',
            ...this.extraHeaders
          },
          signal: AbortSignal.timeout(6000)
        })
        const latencyMs = Math.round(performance.now() - startTime)
        if (response.ok) {
          return { valid: true, latencyMs, modelsCount: this.defaultModels.length }
        }
      } catch {
        // Fallback to true if network times out
      }
      return { valid: true, latencyMs: 15, modelsCount: this.defaultModels.length }
    }

    if (!cleanKey || cleanKey.length === 0) {
      return { valid: false, latencyMs: 0, modelsCount: 0, error: 'API key is required' }
    }

    const baseUrl = this.getBaseUrl(customEndpoint)
    const url = this.validateUrl || `${baseUrl}/models`
    const startTime = performance.now()

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 VersaRail-AI-Agent-Harness/0.1.0',
        ...this.extraHeaders
      }
      if (!this.keyless || (cleanKey && cleanKey !== 'no-key')) {
        headers['Authorization'] = `Bearer ${cleanKey}`
        headers['x-api-key'] = cleanKey
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(Math.min(this.timeoutMs, 15000))
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
        const retryAfter = response.headers.get('retry-after')
        const retryMs = extractRetryDelayMs(response.statusText, retryAfter)
        const delayNotice = retryMs ? ` (resets in ~${Math.round(retryMs / 1000)}s)` : ''
        return { valid: false, latencyMs, modelsCount: 0, error: `Rate limit or quota exceeded (HTTP 429)${delayNotice}` }
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

  async listModels(rawApiKey: string, customEndpoint?: string): Promise<ModelDescriptorDTO[]> {
    const cleanKey = sanitizeApiKey(rawApiKey)

    if (this.keyless && (!cleanKey || cleanKey === 'no-key')) {
      return this.defaultModels
    }

    const baseUrl = this.getBaseUrl(customEndpoint)
    const url = `${baseUrl}/models`

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 VersaRail-AI-Agent-Harness/0.1.0',
        ...this.extraHeaders
      }
      if (!this.keyless || (cleanKey && cleanKey !== 'no-key')) {
        headers['Authorization'] = `Bearer ${cleanKey}`
        headers['x-api-key'] = cleanKey
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(6000)
      })

      if (response.ok) {
        const body = (await response.json()) as { data?: Array<{ id: string;[key: string]: unknown }> }
        if (Array.isArray(body?.data) && body.data.length > 0) {
          // Filter out non-chat models (audio transcription, embeddings, guardrails, tts)
          const chatModels = body.data.filter((m) => {
            const id = (m.id || '').toLowerCase()
            return (
              !id.includes('whisper') &&
              !id.includes('prompt-guard') &&
              !id.includes('safeguard') &&
              !id.includes('tts') &&
              !id.includes('embedding') &&
              !id.includes('orpheus')
            )
          })
          const usableData = chatModels.length > 0 ? chatModels : body.data

          if (this.id !== 'custom') {
            const remoteModelIds = new Set(usableData.map((m) => m.id))
            const matched = this.defaultModels.filter((m) => remoteModelIds.has(m.id))
            if (matched.length > 0) return matched
          }

          // Dynamic discovery for custom gateways (e.g. OmniRoute, LocalAI) or newly added models
          return usableData.map((m) => ({
            id: m.id,
            providerId: this.id,
            name: m.id.startsWith('auto/') ? `⚡ ${m.id} (Auto Switch)` : m.id,
            contextWindow: typeof m.context_length === 'number' ? m.context_length : 128000,
            outputLimit: typeof m.max_output_tokens === 'number' ? m.max_output_tokens : 8192,
            supportsTools: true,
            supportsStreaming: true,
            isFreeTierAvailable: false
          }))
        }
      }
    } catch {
      // Fallback to default models
    }

    return this.defaultModels
  }

  async *streamCompletion(request: ChatCompletionRequest): AsyncIterable<StreamChunk> {
    const cleanKey = sanitizeApiKey(request.apiKey)

    const baseUrl = this.getBaseUrl(request.customEndpoint)
    const url = `${baseUrl}/chat/completions`

    const payload: Record<string, any> = {
      model: request.model,
      messages: request.messages,
      stream: true,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens
    }

    if (request.tools && request.tools.length > 0) {
      payload.tools = request.tools
    }

    if (this.forceSingleToolCall) {
      payload.parallel_tool_calls = false
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 VersaRail-AI-Agent-Harness/0.1.0',
      ...this.extraHeaders
    }
    if (!this.keyless || (cleanKey && cleanKey !== 'no-key')) {
      headers['Authorization'] = `Bearer ${cleanKey}`
      headers['x-api-key'] = cleanKey
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: request.signal
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      let message = errText || response.statusText
      try {
        const parsed = JSON.parse(errText)
        message = parsed.error?.message || parsed.detail || parsed.title || message
      } catch {
        // use raw errText
      }

      // Check if upstream stated a retry delay
      const retryAfter = response.headers.get('retry-after')
      const delayMs = extractRetryDelayMs(message, retryAfter)
      const delayNotice = delayMs ? ` (try again in ~${Math.round(delayMs / 1000)}s)` : ''

      throw new Error(`Upstream ${this.name} error HTTP ${response.status}: ${message}${delayNotice}`)
    }

    if (!response.body) {
      throw new Error(`Upstream ${this.name} returned an empty response body`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let isFirstChunk = true
    let insideReasoning = false
    const thinkFilter = new ThinkTagStreamFilter()

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
          if (trimmed === 'data: [DONE]') {
            if (insideReasoning) {
              insideReasoning = false
              yield { textDelta: '</think>' }
            }
            if (insideReasoning) {
        insideReasoning = false
        yield { textDelta: '</think>' }
      }
      const flushed = thinkFilter.flush()
            if (flushed.contentDelta) {
              yield { textDelta: flushed.contentDelta }
            }
            return
          }

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6)
            let parsed: any
            try {
              parsed = JSON.parse(jsonStr)
            } catch {
              // Ignore single malformed chunk parse errors
              continue
            }

            // Upstream provider error returned in SSE stream payload
            if (parsed.error) {
              const errMsg =
                typeof parsed.error === 'string'
                  ? parsed.error
                  : parsed.error.message || JSON.stringify(parsed.error)
              throw new Error(`Upstream ${this.name} error: ${errMsg}`)
            }

            const choice = parsed.choices?.[0]
            const delta = choice?.delta

            // Handle models that stream internal thoughts via dedicated reasoning field
            const reasoningPart = delta?.reasoning || delta?.reasoning_content
            if (reasoningPart) {
              let text = ''
              if (!insideReasoning) {
                insideReasoning = true
                text += '<think>'
              }
              text += reasoningPart
              yield {
                textDelta: text,
                finishReason: choice?.finish_reason
              }
            }

            if (delta?.content) {
              let contentToProcess = delta.content
              if (insideReasoning) {
                insideReasoning = false
                contentToProcess = '</think>' + contentToProcess
              }

              // In-band anomaly check on first chunk
              if (isFirstChunk) {
                isFirstChunk = false
                const inBandErr = detectInBandError(contentToProcess)
                if (inBandErr) {
                  throw new Error(`In-band provider error detected: ${inBandErr}`)
                }
              }

              // Filter <think>...</think> tags seamlessly
              const filtered = thinkFilter.processChunk(contentToProcess)
              if (filtered.contentDelta) {
                yield {
                  textDelta: filtered.contentDelta,
                  finishReason: choice?.finish_reason
                }
              }
            }

            if (delta?.tool_calls) {
              const toolCalls = delta.tool_calls.map((tc: any) => ({
                index: typeof tc.index === 'number' ? tc.index : 0,
                id: tc.id,
                name: tc.function?.name,
                arguments: tc.function?.arguments !== undefined ? String(tc.function.arguments) : undefined
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
          }
        }
      }

      if (insideReasoning) {
        insideReasoning = false
        yield { textDelta: '</think>' }
      }
      const flushed = thinkFilter.flush()
      if (flushed.contentDelta) {
        yield { textDelta: flushed.contentDelta }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
