import { describe, it, expect } from 'vitest'
import {
  classifyProviderError,
  parseRetryAfter
} from '../../../src/main/agent/error-classifier'

describe('Error Classifier & Taxonomy', () => {
  it('parses Retry-After headers in seconds and HTTP date formats', () => {
    expect(parseRetryAfter({ 'retry-after': '30' })).toBe(30000)
    expect(parseRetryAfter({ 'Retry-After': '12.5' })).toBe(12500)
    expect(parseRetryAfter({ 'x-ratelimit-reset-requests': '45' })).toBe(45000)
  })

  it('parses retry durations embedded in error messages', () => {
    const msg1 = 'Rate limit reached. Please try again in 2.34s.'
    expect(parseRetryAfter(undefined, msg1)).toBe(2340)

    const msg2 = 'Limit exceeded, retry in 2m'
    expect(parseRetryAfter(undefined, msg2)).toBe(120000)
  })

  it('classifies 429 rate limit errors with retry-after duration', () => {
    const error = new Error('Rate limit reached for model llama-3.3-70b-versatile. Please try again in 5s.')
    const normalized = classifyProviderError(error, 'groq', undefined, 429)

    expect(normalized.kind).toBe('rate_limit')
    expect(normalized.providerId).toBe('groq')
    expect(normalized.httpStatus).toBe(429)
    expect(normalized.isRetryable).toBe(true)
    expect(normalized.isFallbackEligible).toBe(true)
    expect(normalized.retryAfterMs).toBe(5000)
    expect(normalized.clientSafeMessage).toContain('GROQ rate limit reached')
  })

  it('classifies quota and credit exhaustion errors', () => {
    const error = new Error('insufficient_quota: You exceeded your current quota, please check your plan and billing details.')
    const normalized = classifyProviderError(error, 'openrouter', undefined, 402)

    expect(normalized.kind).toBe('quota_exhausted')
    expect(normalized.isRetryable).toBe(false)
    expect(normalized.isFallbackEligible).toBe(true)
    expect(normalized.clientSafeMessage).toContain('quota or credit limit exhausted')
  })

  it('classifies authentication errors (401/403) and sanitizes secrets', () => {
    const error = new Error('Invalid API Key provided: AIzaSyD9876543210SecretKey')
    const normalized = classifyProviderError(error, 'gemini', undefined, 401)

    expect(normalized.kind).toBe('authentication_failed')
    expect(normalized.isRetryable).toBe(false)
    expect(normalized.isFallbackEligible).toBe(true)
    expect(normalized.rawMessage).not.toContain('AIzaSyD9876543210SecretKey')
    expect(normalized.clientSafeMessage).toBe('Invalid or unauthorized API key for GEMINI.')
  })

  it('classifies context length exceeded errors', () => {
    const error = new Error("This model's maximum context length is 8192 tokens. However, your messages resulted in 10500 tokens.")
    const normalized = classifyProviderError(error, 'cerebras', undefined, 400)

    expect(normalized.kind).toBe('context_length_exceeded')
    expect(normalized.isRetryable).toBe(false)
    expect(normalized.isFallbackEligible).toBe(true)
    expect(normalized.clientSafeMessage).toContain('exceeds maximum context window')
  })

  it('classifies in-band anomalies (HTTP 200 with error body)', () => {
    const inBandText = '{"error": {"code": "rate_limit_exceeded", "message": "Too many requests"}}'
    const normalized = classifyProviderError(inBandText, 'groq')

    expect(normalized.kind).toBe('in_band_anomaly')
    expect(normalized.httpStatus).toBe(200)
    expect(normalized.isRetryable).toBe(true)
    expect(normalized.isFallbackEligible).toBe(true)
  })

  it('classifies 503 server overloaded with temporary outage retry', () => {
    const error = new Error('Service Unavailable: upstream cluster overloaded')
    const normalized = classifyProviderError(error, 'gemini', undefined, 503)

    expect(normalized.kind).toBe('server_overloaded')
    expect(normalized.httpStatus).toBe(503)
    expect(normalized.isRetryable).toBe(true)
    expect(normalized.isFallbackEligible).toBe(true)
    expect(normalized.retryAfterMs).toBe(5000)
  })
})

