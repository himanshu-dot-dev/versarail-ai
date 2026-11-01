import { describe, it, expect } from 'vitest'
import {
  parseHeaderRetryMs,
  parseProseOrProtobufRetryMs,
  extractRetryDelayMs
} from '../../../src/main/providers/utils/retry-parser'

describe('Retry-After, Protobuf & Prose Delay Parser', () => {
  it('parses standard integer HTTP Retry-After headers in seconds', () => {
    expect(parseHeaderRetryMs('45')).toBe(45000)
    expect(parseHeaderRetryMs('120')).toBe(120000)
    expect(parseHeaderRetryMs('0')).toBeUndefined()
  })

  it('parses HTTP date Retry-After headers', () => {
    const future = Date.now() + 60000
    const futureDateStr = new Date(future).toUTCString()
    const parsed = parseHeaderRetryMs(futureDateStr)
    expect(parsed).toBeGreaterThan(50000)
    expect(parsed).toBeLessThanOrEqual(60000)
  })

  it('parses Protobuf duration strings', () => {
    expect(parseProseOrProtobufRetryMs('17s')).toBe(17000)
    expect(parseProseOrProtobufRetryMs('1.5s')).toBe(1500)
    expect(parseProseOrProtobufRetryMs('0.25s')).toBe(250)
  })

  it('parses compound prose durations from rate limit errors', () => {
    expect(
      parseProseOrProtobufRetryMs('Upstream rate limit reached. Please try again in 1m26s.')
    ).toBe(86000) // 60s + 26s = 86s

    expect(
      parseProseOrProtobufRetryMs('Rate limit exceeded: retry after 30 seconds')
    ).toBe(30000)

    expect(
      parseProseOrProtobufRetryMs('try again in 45s')
    ).toBe(45000)

    expect(
      parseProseOrProtobufRetryMs('Please try again in 2 minutes')
    ).toBe(120000)
  })

  it('extracts delay seamlessly from Error instances and headers', () => {
    const err = new Error('Groq 429: Rate limit hit. Please try again in 15s.')
    expect(extractRetryDelayMs(err)).toBe(15000)

    expect(extractRetryDelayMs(new Error('Generic error'), '30')).toBe(30000)
  })

  it('clamps extreme delay values to 24 hours', () => {
    const extremeMs = parseHeaderRetryMs('999999999')
    expect(extremeMs).toBe(24 * 60 * 60 * 1000)
  })
})

