import { describe, it, expect } from 'vitest'
import { detectInBandError } from '../../../src/main/providers/utils/in-band-detector'

describe('In-Band Error & Anomaly Detector', () => {
  it('detects insufficient credits notices in HTTP 200 payloads', () => {
    const errorMsg = 'Your account has insufficient credit to process this request. Please top up.'
    const detected = detectInBandError(errorMsg)
    expect(detected).not.toBeNull()
    expect(detected).toContain('insufficient credit')
  })

  it('detects rate limit and overload notices', () => {
    const errorMsg = 'Warning: Rate limit reached for free tier model. Please wait.'
    const detected = detectInBandError(errorMsg)
    expect(detected).not.toBeNull()
    expect(detected).toContain('Rate limit reached')
  })

  it('returns null for normal AI conversation text', () => {
    const normalResponse = 'Here is the refactored auth module with timingSafeEqual comparison.'
    const detected = detectInBandError(normalResponse)
    expect(detected).toBeNull()
  })

  it('handles null, undefined, and empty string safely', () => {
    expect(detectInBandError(null)).toBeNull()
    expect(detectInBandError(undefined)).toBeNull()
    expect(detectInBandError('')).toBeNull()
  })
})

