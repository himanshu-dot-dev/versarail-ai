/**
 * Resilient Retry-After, Protobuf, and Prose Delay Parser
 *
 * Extracts exact back-off delays from:
 * 1. HTTP Retry-After headers (delta seconds or HTTP-Date)
 * 2. Protobuf duration strings ("17s", "1.5s", "0.25s")
 * 3. Prose error messages ("try again in 1m26s", "retry after 30 seconds", "Please try again in 5.2s")
 *
 * Clamped to 24 hours to prevent pathological upstream headers from locking out credentials indefinitely.
 */

const MAX_RETRY_AFTER_MS = 24 * 60 * 60 * 1000 // 24 hours

const PROTOBUF_DURATION = /^(\d+(?:\.\d+)?)s$/i

const PROSE_RETRY = /(?:try again|retry)\s+(?:in|after)\s+(\d+(?:\.\d+)?\s*[a-z]+(?:\s*\d+(?:\.\d+)?\s*[a-z]+)*)/i
const DURATION_PART = /(\d+(?:\.\d+)?)\s*([a-z]+)/gi

const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  sec: 1000,
  secs: 1000,
  second: 1000,
  seconds: 1000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000
}

function clampRetryMs(ms: number): number | undefined {
  if (!Number.isFinite(ms) || ms <= 0) return undefined
  return Math.min(ms, MAX_RETRY_AFTER_MS)
}

/**
 * Parses HTTP Retry-After header
 */
export function parseHeaderRetryMs(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) {
    return clampRetryMs(Number(trimmed) * 1000)
  }
  const when = Date.parse(trimmed)
  if (!Number.isNaN(when)) {
    return clampRetryMs(Math.max(0, when - Date.now()))
  }
  return undefined
}

/**
 * Parses duration from error strings or objects (Protobuf, prose, or JSON)
 */
export function parseProseOrProtobufRetryMs(textOrBody: unknown): number | undefined {
  if (!textOrBody) return undefined

  let str = ''
  if (typeof textOrBody === 'string') {
    str = textOrBody
  } else if (typeof textOrBody === 'object') {
    try {
      str = JSON.stringify(textOrBody)
    } catch {
      return undefined
    }
  }

  if (!str) return undefined

  // 1. Check for protobuf duration format if short
  const protobufMatch = PROTOBUF_DURATION.exec(str.trim())
  if (protobufMatch) {
    return clampRetryMs(Number(protobufMatch[1]) * 1000)
  }

  // 2. Check for prose retry patterns ("try again in 1m26s")
  const prose = PROSE_RETRY.exec(str)
  if (prose && prose[1]) {
    let totalMs = 0
    let matchedAny = false
    for (const [, amount, unitName] of prose[1].matchAll(DURATION_PART)) {
      const unit = UNIT_MS[unitName.toLowerCase()]
      if (!unit) break
      totalMs += Number(amount) * unit
      matchedAny = true
    }
    if (matchedAny && totalMs > 0) {
      return clampRetryMs(totalMs)
    }
  }

  return undefined
}

/**
 * Universal delay extractor from an Error or HTTP response payload
 */
export function extractRetryDelayMs(
  errorOrMessage: unknown,
  retryAfterHeader?: string | null
): number | undefined {
  // Check header first if provided
  const headerMs = parseHeaderRetryMs(retryAfterHeader)
  if (headerMs !== undefined) return headerMs

  if (!errorOrMessage) return undefined

  if (typeof errorOrMessage === 'string') {
    return parseProseOrProtobufRetryMs(errorOrMessage)
  }

  if (errorOrMessage instanceof Error) {
    return parseProseOrProtobufRetryMs(errorOrMessage.message)
  }

  return parseProseOrProtobufRetryMs(errorOrMessage)
}

