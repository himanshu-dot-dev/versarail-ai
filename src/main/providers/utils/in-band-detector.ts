/**
 * In-Band Error & Anomaly Detector
 *
 * Some free and community endpoints answer with HTTP 200 OK, but place
 * an out-of-credits, rate-limit, or top-up notice directly inside the response text.
 * This utility catches these anomalies so the router can immediately trigger failover.
 */

const IN_BAND_PATTERNS = [
  /insufficient\s+credit/i,
  /not\s+enough\s+credits/i,
  /top-?up\s+(your\s+)?account/i,
  /rate\s+limit\s+reached/i,
  /too\s+many\s+requests/i,
  /quota\s+exceeded/i,
  /model\s+is\s+currently\s+overloaded/i,
  /free\s+tier\s+limit\s+exceeded/i
]

export function detectInBandError(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null
  const trimmed = text.trim()

  for (const pattern of IN_BAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return trimmed.slice(0, 160)
    }
  }

  return null
}

export const InBandDetector = {
  detect: (text: string | null | undefined) => detectInBandError(text) !== null,
  getMatch: (text: string | null | undefined) => detectInBandError(text)
}

