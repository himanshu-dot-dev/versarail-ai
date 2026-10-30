import { describe, it, expect, vi } from 'vitest'
import { SecretStorageService } from '../../src/main/security/safe-storage.service'

describe('SecretStorageService Security Policies', () => {
  it('masks secret keys correctly without exposing content', () => {
    const key = 'AIzaSyDemoSecretKeyForTesting12345678'
    const masked = SecretStorageService.maskKey(key)

    expect(masked).toBe('AIza••••••••5678')
    expect(masked).not.toContain('DemoSecretKeyForTesting')
  })

  it('handles short keys safely by returning fixed mask', () => {
    const masked = SecretStorageService.maskKey('short')
    expect(masked).toBe('••••••••')
  })

  it('refuses persistence and falls back to session storage when Linux basic_text is detected', async () => {
    // Mock safeStorage to simulate Linux basic_text
    vi.mock('electron', () => {
      return {
        app: {
          getPath: vi.fn().mockReturnValue('/mock/userdata')
        },
        safeStorage: {
          isEncryptionAvailable: vi.fn().mockReturnValue(true),
          getSelectedStorageBackend: vi.fn().mockReturnValue('basic_text'),
          encryptStringAsync: vi.fn(),
          decryptStringAsync: vi.fn()
        }
      }
    })

    const service = SecretStorageService.getInstance()
    expect(service.isHardwareEncryptionAvailable()).toBe(false)

    // Save credential under basic_text
    const result = await service.saveCredential({
      id: 'cred-session-1',
      providerId: 'groq',
      label: 'Session Groq Key',
      apiKey: 'gsk_session_secret_key_12345'
    })

    // Assert it flagged as session only
    expect(result.isSessionOnly).toBe(true)

    // Verify key is accessible in memory during this session
    const retrieved = await service.getDecryptedKey('cred-session-1')
    expect(retrieved).toBe('gsk_session_secret_key_12345')

    // Verify list metadata returns masked key
    const metadata = service.listCredentialMetadata()
    const item = metadata.find((m) => m.id === 'cred-session-1')
    expect(item).toBeDefined()
    expect(item?.isSessionOnly).toBe(true)
    expect(item?.maskedKey).not.toContain('session_secret_key')
  })
})

