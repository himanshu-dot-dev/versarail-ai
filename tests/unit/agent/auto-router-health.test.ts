import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProviderRegistry } from '../../../src/main/providers/provider-registry'
import { FailoverEngine } from '../../../src/main/agent/failover-engine'
import { SecretStorageService } from '../../../src/main/security/safe-storage.service'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('Auto-Router Health Ledger & Provider LRU Rotation', () => {
  let tempDir: string
  let dbPath: string
  let registry: ProviderRegistry
  let failoverEngine: FailoverEngine
  let secretStore: SecretStorageService

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-router-health-test-'))
    dbPath = path.join(tempDir, 'test-health.db')

    // Reset singletons
    // @ts-expect-error Reset singleton
    SqliteDatabase.instance = null
    // @ts-expect-error Reset singleton
    SecretStorageService.instance = null
    // @ts-expect-error Reset singleton
    ProviderRegistry.instance = null
    // @ts-expect-error Reset singleton
    FailoverEngine.instance = null

    const db = SqliteDatabase.getInstance(dbPath)
    db.runMigrations()

    secretStore = SecretStorageService.getInstance(path.join(tempDir, 'secrets.json'))
    registry = ProviderRegistry.getInstance()
    failoverEngine = FailoverEngine.getInstance()
  })

  afterEach(() => {
    try {
      const db = SqliteDatabase.getInstance()
      db.close()
    } catch {
      // Ignore
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('persists cooldowns and escalating strikes to SQLite provider_health table', () => {
    registry.setCooldown('cred-groq', 10000, 'Rate limit exceeded', 'llama-3.3-70b-versatile')
    expect(registry.getStrikes('cred-groq', 'llama-3.3-70b-versatile')).toBe(1)

    // Second strike escalates backoff
    registry.setCooldown('cred-groq', 10000, 'Rate limit exceeded', 'llama-3.3-70b-versatile')
    expect(registry.getStrikes('cred-groq', 'llama-3.3-70b-versatile')).toBe(2)

    const db = SqliteDatabase.getInstance()
    const row = db
      .prepare('SELECT status, strikes, cooldown_until FROM provider_health WHERE key_id = ?')
      .get('cred-groq::llama-3.3-70b-versatile') as any

    expect(row).toBeDefined()
    expect(row.status).toBe('cooldown')
    expect(row.strikes).toBe(2)
    expect(row.cooldown_until).toBeGreaterThan(Date.now())
  })

  it('restores health ledger and cooldowns from SQLite on registry restart', () => {
    const futureExpiry = Date.now() + 60000
    const db = SqliteDatabase.getInstance()
    db.prepare(`
      INSERT INTO provider_health (key_id, provider_id, model_id, status, strikes, cooldown_until, last_error, last_used_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('cred-gemini::gemini-2.5-flash', 'gemini', 'gemini-2.5-flash', 'cooldown', 3, futureExpiry, 'Quota exhausted', Date.now() - 5000, new Date().toISOString())

    // Simulate app restart by resetting and re-instantiating ProviderRegistry
    // @ts-expect-error Reset singleton
    ProviderRegistry.instance = null
    const freshRegistry = ProviderRegistry.getInstance()

    const expiry = freshRegistry.getCooldownExpiry('cred-gemini', 'gemini-2.5-flash')
    expect(expiry).toBe(futureExpiry)
    expect(freshRegistry.getStrikes('cred-gemini', 'gemini-2.5-flash')).toBe(3)
  })

  it('rotates healthy candidates using Provider-Level LRU when auto provider is requested', async () => {
    await secretStore.saveCredential({
      id: 'cred-gemini',
      providerId: 'gemini',
      label: 'Google Gemini',
      apiKey: 'AIzaSyMockGeminiKey123456789012345678'
    })

    await secretStore.saveCredential({
      id: 'cred-groq',
      providerId: 'groq',
      label: 'Groq Cloud',
      apiKey: 'gsk_mockGroqKey12345678901234567890'
    })

    await secretStore.saveCredential({
      id: 'cred-mistral',
      providerId: 'mistral',
      label: 'Mistral AI',
      apiKey: 'mockMistralKey12345678901234567890'
    })

    // Mark Gemini as recently used
    registry.recordProviderUsage('gemini')

    // Initial candidates under auto policy
    const candidates = failoverEngine.getCandidateModels({
      preferredProviderId: 'auto' as any,
      preferredModelId: 'auto/free'
    })

    expect(candidates.length).toBeGreaterThan(0)
    // Groq or Mistral should appear before Gemini because Gemini was recently used
    const geminiIndex = candidates.findIndex((c) => c.providerId === 'gemini')
    const groqIndex = candidates.findIndex((c) => c.providerId === 'groq')

    expect(groqIndex).toBeLessThan(geminiIndex)

    // Now record Groq usage as very recent
    registry.recordProviderUsage('groq')

    const reorderedCandidates = failoverEngine.getCandidateModels({
      preferredProviderId: 'auto' as any,
      preferredModelId: 'auto/free'
    })

    const newGroqIndex = reorderedCandidates.findIndex((c) => c.providerId === 'groq')
    const newMistralIndex = reorderedCandidates.findIndex((c) => c.providerId === 'mistral')
    expect(newMistralIndex).toBeLessThan(newGroqIndex)
  })

  it('clears cooldown and resets strikes on successful operation', () => {
    registry.setCooldown('cred-cerebras', 15000, '429 Rate limit', 'llama3.3-70b')
    expect(registry.getCooldownExpiry('cred-cerebras', 'llama3.3-70b')).toBeGreaterThan(Date.now())

    registry.clearCooldown('cred-cerebras', 'llama3.3-70b')
    expect(registry.getCooldownExpiry('cred-cerebras', 'llama3.3-70b')).toBeNull()
    expect(registry.getStrikes('cred-cerebras', 'llama3.3-70b')).toBe(0)

    const db = SqliteDatabase.getInstance()
    const row = db
      .prepare('SELECT status, strikes, cooldown_until FROM provider_health WHERE key_id = ?')
      .get('cred-cerebras::llama3.3-70b') as any

    expect(row.status).toBe('ok')
    expect(row.strikes).toBe(0)
    expect(row.cooldown_until).toBe(0)
  })
})

