import { ProviderId } from '@shared/domain/models'
import { SecretRedactor } from '../security/secret-redactor'
import { InBandDetector } from '../providers/utils/in-band-detector'
import { extractRetryDelayMs } from '../providers/utils/retry-parser'

export type ProviderErrorKind =
  | 'rate_limit'
  | 'quota_exhausted'
  | 'authentication_failed'
  | 'context_length_exceeded'
  | 'model_not_found'
  | 'server_overloaded'
  | 'network_timeout'
  | 'in_band_anomaly'
  | 'cancelled'
  | 'unknown'

export interface NormalizedProviderError {
  kind: ProviderErrorKind
  providerId: ProviderId
  httpStatus?: number
  retryAfterMs?: number
  isRetryable: boolean
  isFallbackEligible: boolean
  rawMessage: string
  clientSafeMessage: string
}

/**
 * Extracts retry-after duration in milliseconds from HTTP response headers or error messages.
 */
export function parseRetryAfter(
  headers?: Headers | Record<string, string | string[] | undefined>,
  message?: string
): number | null {
  // 1. Check HTTP Headers if present
  if (headers) {
    let retryHeader: string | undefined
    let resetReqHeader: string | undefined

    if (typeof (headers as Headers).get === 'function') {
      const h = headers as Headers
      retryHeader = h.get('retry-after') || undefined
      resetReqHeader = h.get('x-ratelimit-reset-requests') || h.get('x-ratelimit-reset') || undefined
    } else {
      const rec = headers as Record<string, string | string[] | undefined>
      const findHeader = (name: string): string | undefined => {
        const key = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase())
        if (!key) return undefined
        const val = rec[key]
        return Array.isArray(val) ? val[0] : val
      }
      retryHeader = findHeader('retry-after')
      resetReqHeader = findHeader('x-ratelimit-reset-requests') || findHeader('x-ratelimit-reset')
    }

    if (retryHeader) {
      const sec = parseFloat(retryHeader)
      if (!isNaN(sec) && sec > 0) {
        return Math.round(sec * 1000)
      }
      // Try HTTP date format
      const dateMs = Date.parse(retryHeader)
      if (!isNaN(dateMs) && dateMs > Date.now()) {
        return dateMs - Date.now()
      }
    }

    if (resetReqHeader) {
      const sec = parseFloat(resetReqHeader)
      if (!isNaN(sec) && sec > 0) {
        return Math.round(sec * 1000)
      }
    }
  }

  // 2. Parse from message body regex (e.g. "try again in 2.34s", "reset in 45s", "retry in 2m30s", "try again in 1m26s")
  if (message) {
    const extracted = extractRetryDelayMs(message)
    if (extracted !== undefined) return extracted

    const minSecMatch = message.match(/(?:try again in|retry in|reset in|wait)\s*([0-9.]+)\s*(s|sec|seconds|m|min|minutes)/i)
    if (minSecMatch) {
      const val = parseFloat(minSecMatch[1])
      const unit = minSecMatch[2].toLowerCase()
      if (!isNaN(val) && val > 0) {
        if (unit.startsWith('m')) {
          return Math.round(val * 60 * 1000)
        }
        return Math.round(val * 1000)
      }
    }
  }

  return null
}

/**
 * Normalizes disparate error structures across Gemini, Groq, Cerebras, OpenRouter,
 * and network faults into a standardized, client-safe taxonomy.
 */
export function classifyProviderError(
  err: unknown,
  providerId: ProviderId,
  headers?: Headers | Record<string, string | string[] | undefined>,
  httpStatusOverride?: number
): NormalizedProviderError {
  let rawMessage = ''
  let status = httpStatusOverride

  if (err instanceof Error) {
    rawMessage = err.message || err.toString()
    if (!status && 'status' in err && typeof (err as any).status === 'number') {
      status = (err as any).status
    }
    if (!status && 'statusCode' in err && typeof (err as any).statusCode === 'number') {
      status = (err as any).statusCode
    }
  } else if (typeof err === 'string') {
    rawMessage = err
  } else if (err && typeof err === 'object') {
    rawMessage = JSON.stringify(err)
    if (!status && 'status' in err && typeof (err as any).status === 'number') {
      status = (err as any).status
    }
  }

  // Check if message mentions HTTP status: e.g. "HTTP 429", "status code 401"
  if (!status) {
    const statusMatch = rawMessage.match(/HTTP\s+(\d{3})|status\s+code\s+(\d{3})/i)
    if (statusMatch) {
      status = parseInt(statusMatch[1] || statusMatch[2], 10)
    }
  }

  // Redact any raw API keys or sensitive authorization tokens in message
  const sanitizedMessage = SecretRedactor.redact(rawMessage)

  // In-Band Anomaly check (HTTP 200 with error JSON body or no HTTP error status)
  if ((!status || status === 200) && InBandDetector.detect(sanitizedMessage)) {
    const isCreditOrQuota = /credit|billing|insufficient\s+credit/i.test(sanitizedMessage)
    const retryMs = parseRetryAfter(headers, sanitizedMessage) || (isCreditOrQuota ? undefined : 45000)
    return {
      kind: isCreditOrQuota ? 'quota_exhausted' : 'in_band_anomaly',
      providerId,
      httpStatus: 200,
      retryAfterMs: retryMs,
      isRetryable: !isCreditOrQuota,
      isFallbackEligible: true,
      rawMessage: sanitizedMessage,
      clientSafeMessage: isCreditOrQuota
        ? `${providerId.toUpperCase()} quota or credit balance is exhausted`
        : `${providerId.toUpperCase()} returned an in-band rate limit or capacity warning`
    }
  }

  // Cancellation
  if (
    sanitizedMessage.toLowerCase().includes('cancelled') ||
    sanitizedMessage.toLowerCase().includes('aborted')
  ) {
    return {
      kind: 'cancelled',
      providerId,
      httpStatus: status,
      isRetryable: false,
      isFallbackEligible: false,
      rawMessage: sanitizedMessage,
      clientSafeMessage: 'Generation cancelled by user'
    }
  }

  // 1. Rate Limit (429 or text)
  if (
    status === 429 ||
    /rate\s*limit|ratelimit|too many requests|resource_exhausted|tpm|rpm|rpd/i.test(sanitizedMessage)
  ) {
    const retryAfterMs = parseRetryAfter(headers, sanitizedMessage) || 45000
    const retrySeconds = Math.ceil(retryAfterMs / 1000)
    return {
      kind: 'rate_limit',
      providerId,
      httpStatus: 429,
      retryAfterMs,
      isRetryable: true,
      isFallbackEligible: true,
      rawMessage: sanitizedMessage,
      clientSafeMessage: `${providerId.toUpperCase()} rate limit reached. Resets in ~${retrySeconds}s.`
    }
  }

  // 2. Quota / Credits Exhausted (402 or text)
  if (
    status === 402 ||
    /insufficient\s*(credit|quota|balance)|credit\s*balance|billing\s*hard\s*limit|exceeded your current quota|purchase pre-paid credits/i.test(
      sanitizedMessage
    )
  ) {
    let clientSafeMessage = `${providerId.toUpperCase()} quota or credit limit exhausted. Please top up your account.`
    if (providerId === 'huggingface' || /purchase pre-paid credits/i.test(sanitizedMessage)) {
      clientSafeMessage = `${providerId.toUpperCase()} quota or credit limit exhausted. Hugging Face Router requires pre-paid credits or a PRO subscription to use inference providers.`
    }
    return {
      kind: 'quota_exhausted',
      providerId,
      httpStatus: status || 402,
      isRetryable: false,
      isFallbackEligible: true,
      rawMessage: sanitizedMessage,
      clientSafeMessage
    }
  }

  // 3. Authentication / Key Invalid (401, 403, or text)
  if (
    status === 401 ||
    status === 403 ||
    /invalid\s*api\s*key|unauthorized|forbidden|authentication\s*failed|api_key_invalid/i.test(
      sanitizedMessage
    )
  ) {
    return {
      kind: 'authentication_failed',
      providerId,
      httpStatus: status || 401,
      isRetryable: false,
      isFallbackEligible: true,
      rawMessage: sanitizedMessage,
      clientSafeMessage: `Invalid or unauthorized API key for ${providerId.toUpperCase()}.`
    }
  }

  // 4. Context Length Exceeded (400 or text)
  if (
    /context\s*length|maximum\s*context|token\s*limit|too\s*long|context_window_exceeded/i.test(
      sanitizedMessage
    )
  ) {
    return {
      kind: 'context_length_exceeded',
      providerId,
      httpStatus: status || 400,
      isRetryable: false,
      isFallbackEligible: true,
      rawMessage: sanitizedMessage,
      clientSafeMessage: `Prompt exceeds maximum context window for this model.`
    }
  }

  // 5. Model Not Found / Decommissioned (404 or text)
  if (
    status === 404 ||
    /model\s*not\s*found|model.*does not exist|decommissioned|not supported by any provider|model_not_supported|not a chat model/i.test(
      sanitizedMessage
    )
  ) {
    return {
      kind: 'model_not_found',
      providerId,
      httpStatus: 404,
      isRetryable: false,
      isFallbackEligible: true,
      rawMessage: sanitizedMessage,
      clientSafeMessage: `Requested model is not available or has been decommissioned on ${providerId.toUpperCase()}.`
    }
  }

  // 6. Server Overloaded / Temporary Outage (500, 502, 503, 504)
  if (
    (status && status >= 500 && status <= 504) ||
    /overloaded|service\s*unavailable|bad\s*gateway|gateway\s*timeout|high\s*traffic/i.test(
      sanitizedMessage
    )
  ) {
    const retryAfterMs = parseRetryAfter(headers, sanitizedMessage) || 5000
    return {
      kind: 'server_overloaded',
      providerId,
      httpStatus: status || 503,
      retryAfterMs,
      isRetryable: true,
      isFallbackEligible: true,
      rawMessage: sanitizedMessage,
      clientSafeMessage: `${providerId.toUpperCase()} servers are temporarily overloaded or unavailable.`
    }
  }

  // 7. Network / Socket Timeout
  if (
    /econnreset|etimedout|enotfound|fetch\s*failed|network\s*error|timeout/i.test(sanitizedMessage)
  ) {
    return {
      kind: 'network_timeout',
      providerId,
      isRetryable: true,
      isFallbackEligible: true,
      rawMessage: sanitizedMessage,
      clientSafeMessage: `Network connection to ${providerId.toUpperCase()} timed out or failed.`
    }
  }

  // Default unknown
  return {
    kind: 'unknown',
    providerId,
    httpStatus: status,
    isRetryable: false,
    isFallbackEligible: true,
    rawMessage: sanitizedMessage,
    clientSafeMessage: `Error from ${providerId.toUpperCase()}: ${sanitizedMessage.slice(0, 120)}`
  }
}
