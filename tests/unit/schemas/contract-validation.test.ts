import { describe, it, expect } from 'vitest'
import { SaveCredentialSchema } from '../../../src/shared/schemas/provider.schema'
import { PermissionResponseSchema } from '../../../src/shared/schemas/permission.schema'

describe('Contract Schema Validation', () => {
  describe('SaveCredentialSchema', () => {
    it('accepts valid credential payloads', () => {
      const valid = {
        providerId: 'gemini',
        label: 'My Personal Gemini Key',
        apiKey: 'AIzaSyDemoKey123456789'
      }
      const parsed = SaveCredentialSchema.safeParse(valid)
      expect(parsed.success).toBe(true)
    })

    it('rejects empty or whitespace labels', () => {
      const invalid = {
        providerId: 'groq',
        label: '',
        apiKey: 'gsk_demo123456'
      }
      const parsed = SaveCredentialSchema.safeParse(invalid)
      expect(parsed.success).toBe(false)
    })

    it('prohibits SSRF to cloud metadata endpoints', () => {
      const ssrfPayload = {
        providerId: 'custom',
        label: 'Malicious Endpoint',
        apiKey: 'test-key',
        customEndpoint: 'http://169.254.169.254/latest/meta-data/'
      }
      const parsed = SaveCredentialSchema.safeParse(ssrfPayload)
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.errors[0].message).toContain('cloud metadata')
      }
    })
  })

  describe('PermissionResponseSchema', () => {
    it('accepts valid UUID and allow decision', () => {
      const valid = {
        requestId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        decision: 'allow',
        rememberScope: 'session'
      }
      const parsed = PermissionResponseSchema.safeParse(valid)
      expect(parsed.success).toBe(true)
    })

    it('rejects invalid decision strings', () => {
      const invalid = {
        requestId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        decision: 'bypass_security'
      }
      const parsed = PermissionResponseSchema.safeParse(invalid)
      expect(parsed.success).toBe(false)
    })
  })
})

