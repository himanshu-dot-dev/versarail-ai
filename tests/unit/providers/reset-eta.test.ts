import { describe, it, expect } from 'vitest'
import { formatResetEta, summarizeExhaustion } from '../../../src/main/providers/utils/reset-eta'

describe('Reset ETA & Exhaustion Formatter', () => {
  it('formats seconds, minutes, and hours accurately', () => {
    const now = 1000000
    expect(formatResetEta(now + 45000, now)).toBe('~45s')
    expect(formatResetEta(now + 180000, now)).toBe('~3m')
    expect(formatResetEta(now + 7200000, now)).toBe('~2h')
  })

  it('returns null for lapsed or null cooldowns', () => {
    const now = 1000000
    expect(formatResetEta(null, now)).toBeNull()
    expect(formatResetEta(now - 5000, now)).toBeNull()
  })

  it('generates actionable exhaustion summary across multiple models', () => {
    const now = 1000000
    const summary = summarizeExhaustion(
      [
        {
          modelId: 'gemini-2.5-flash',
          provider: 'Google AI Studio',
          reason: 'rate_limit',
          resetAt: now + 45000
        },
        {
          modelId: 'llama-3.3-70b',
          provider: 'GroqCloud',
          reason: 'quota_exhausted',
          resetAt: now + 120000
        }
      ],
      now
    )

    expect(summary).toContain('All models exhausted')
    expect(summary).toContain('Google AI Studio')
    expect(summary).toContain('~45s')
    expect(summary).toContain('Soonest reset is ~45s')
  })
})

