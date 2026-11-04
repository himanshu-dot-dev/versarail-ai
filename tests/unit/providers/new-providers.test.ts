import { describe, it, expect, beforeEach } from 'vitest'
import { ProviderRegistry } from '../../../src/main/providers/provider-registry'

describe('New Provider Adapters & Keyless Tiers', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    ProviderRegistry.resetInstance()
    registry = ProviderRegistry.getInstance()
  })

  it('registers all 13 providers including NVIDIA, Mistral, DeepSeek, Cloudflare, Cohere, Pollinations, and Kilo', () => {
    const adapters = registry.getAllAdapters()
    const providerIds = adapters.map((a) => a.id)

    expect(providerIds).toContain('gemini')
    expect(providerIds).toContain('groq')
    expect(providerIds).toContain('cerebras')
    expect(providerIds).toContain('openrouter')
    expect(providerIds).toContain('nvidia')
    expect(providerIds).toContain('mistral')
    expect(providerIds).toContain('huggingface')
    expect(providerIds).toContain('cohere')
    expect(providerIds).toContain('deepseek')
    expect(providerIds).toContain('cloudflare')
    expect(providerIds).toContain('pollinations')
    expect(providerIds).toContain('kilo')
    expect(providerIds).toContain('custom')
  })

  it('validates keyless providers without requiring an API key', async () => {
    const pollinations = registry.getAdapter('pollinations')
    expect(pollinations).toBeDefined()

    const result = await pollinations!.validateKey('no-key')
    expect(result.valid).toBe(true)

    const kilo = registry.getAdapter('kilo')
    expect(kilo).toBeDefined()

    const kiloResult = await kilo!.validateKey('')
    expect(kiloResult.valid).toBe(true)
  }, 15000)

  it('applies exact parsed back-off delays to cooldowns', () => {
    const credentialId = 'test-cred-1'
    registry.setCooldown(credentialId, 10000, 'Rate limit exceeded: try again in 1m26s')

    const expiry = registry.getCooldownExpiry(credentialId)
    expect(expiry).not.toBeNull()

    const remainingMs = expiry! - Date.now()
    // Should be approximately 86,000ms (86 seconds)
    expect(remainingMs).toBeGreaterThan(80000)
    expect(remainingMs).toBeLessThanOrEqual(87000)
  })
})

