import { createHash } from 'crypto'

export class ToctouTamperingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToctouTamperingError'
  }
}

/**
 * Deterministically serializes any JavaScript value to a canonical JSON string.
 * Object keys are sorted alphabetically at all nesting levels, ensuring
 * that identical semantic payloads produce identical byte sequences regardless of key order.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return '[' + value.map(canonicalizeJson).join(',') + ']'
  }

  const record = value as Record<string, unknown>
  const sortedKeys = Object.keys(record).sort()
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`
  )
  return '{' + entries.join(',') + '}'
}

/**
 * Computes a cryptographically secure SHA-256 hash of a tool execution payload.
 * Used for Time-of-Check to Time-of-Use (TOCTOU) tamper prevention.
 */
export function computePayloadHash(toolName: string, args: Record<string, unknown>): string {
  const canonicalPayload = canonicalizeJson({
    tool: toolName,
    args
  })

  return createHash('sha256').update(canonicalPayload, 'utf8').digest('hex')
}

