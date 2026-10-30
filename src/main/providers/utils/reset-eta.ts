/**
 * Human-Readable Cooldown Expiry & Exhaustion Formatter
 *
 * Turns epoch timestamps into actionable time strings (~45s, ~2m, ~1h)
 * and generates client-safe exhaustion summaries so developers know why
 * routes are cooling down.
 */

export function formatResetEta(cooldownUntilMs: number | null | undefined, now = Date.now()): string | null {
  if (cooldownUntilMs == null) return null
  const deltaMs = cooldownUntilMs - now
  if (deltaMs <= 0) return null

  const secs = Math.round(deltaMs / 1000)
  if (secs < 60) return `~${secs}s`

  const mins = Math.round(secs / 60)
  if (mins < 60) return `~${mins}m`

  const hours = Math.round(mins / 60)
  return `~${hours}h`
}

export interface ModelExhaustionRecord {
  modelId: string
  provider: string
  reason: 'cooldown' | 'rate_limit' | 'quota_exhausted' | 'no_key' | 'context_too_small'
  resetAt?: number | null
}

export function summarizeExhaustion(records: ModelExhaustionRecord[], now = Date.now()): string {
  if (!records || records.length === 0) {
    return 'All provider models exhausted. Please add more API keys or wait for limits to reset.'
  }

  // Find soonest reset
  const resetTimes = records
    .map((r) => r.resetAt)
    .filter((t): t is number => typeof t === 'number' && t > now)

  const soonestReset = resetTimes.length > 0 ? Math.min(...resetTimes) : null
  const etaStr = formatResetEta(soonestReset, now)

  const parts = records.map((r) => {
    const eta = formatResetEta(r.resetAt, now)
    return `${r.provider} (${r.modelId}): ${r.reason}${eta ? ` (resets ${eta})` : ''}`
  })

  return `All models exhausted. ${parts.join(' | ')}. ${
    etaStr ? `Soonest reset is ${etaStr}.` : 'Please verify provider quotas or add alternative keys.'
  }`
}

