import { describe, it, expect } from 'vitest'
import { SecretRedactor } from '../../src/main/security/secret-redactor'

describe('SecretRedactor', () => {
  it('redacts Google Gemini API keys', () => {
    const input = 'Initializing client with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q'
    const output = SecretRedactor.redact(input)
    expect(output).not.toContain('AIzaSy')
    expect(output).toContain('[REDACTED_SECRET]')
  })

  it('redacts Groq API keys', () => {
    const input = 'Authorization failed for gsk_1234567890abcdef1234567890abcdef1234567890abcdef'
    const output = SecretRedactor.redact(input)
    expect(output).not.toContain('gsk_')
    expect(output).toContain('[REDACTED_SECRET]')
  })

  it('redacts AWS Access Keys', () => {
    const input = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE in config'
    const output = SecretRedactor.redact(input)
    expect(output).not.toContain('AKIAIOSFODNN7EXAMPLE')
    expect(output).toContain('[REDACTED_SECRET]')
  })

  it('redacts Bearer tokens in terminal output', () => {
    const input = 'HTTP 401 Unauthorized for Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    const output = SecretRedactor.redact(input)
    expect(output).toContain('[REDACTED_SECRET]')
  })

  it('redacts structured JSON objects recursively', () => {
    const payload = {
      user: 'alice',
      config: {
        apiKey: 'secret_123456789',
        nested: {
          token: 'another_secret'
        }
      }
    }

    const sanitized = SecretRedactor.redactObject(payload)
    expect(sanitized.config.apiKey).toBe('[REDACTED_SECRET]')
    expect(sanitized.config.nested.token).toBe('[REDACTED_SECRET]')
    expect(sanitized.user).toBe('alice')
  })
})

