import { ProviderId, ModelDescriptorDTO } from '@shared/domain/models'
import { IProviderAdapter } from './provider-adapter.interface'
import { GeminiAdapter } from './gemini.adapter'
import { GroqAdapter } from './groq.adapter'
import { CerebrasAdapter } from './cerebras.adapter'
import { OpenRouterAdapter } from './openrouter.adapter'
import { OpenAICompatAdapter } from './openai-compat.adapter'
import { NvidiaAdapter } from './nvidia.adapter'
import { MistralAdapter } from './mistral.adapter'
import { HuggingFaceAdapter } from './huggingface.adapter'
import { CohereAdapter } from './cohere.adapter'
import { DeepSeekAdapter } from './deepseek.adapter'
import { CloudflareAdapter } from './cloudflare.adapter'
import { PollinationsAdapter } from './pollinations.adapter'
import { KiloAdapter } from './kilo.adapter'
import { extractRetryDelayMs } from './utils/retry-parser'
import { SqliteDatabase } from '../storage/sqlite-database'

export interface KeyLeaseState {
  activeRequests: number
  maxConcurrency: number
  cooldownUntilMs: number | null
  lastError?: string
}

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null
  private adapters: Map<ProviderId, IProviderAdapter> = new Map()
  private keyStates: Map<string, KeyLeaseState> = new Map()
  private modelCooldowns: Map<string, { cooldownUntilMs: number; reason?: string }> = new Map()
  private strikes: Map<string, number> = new Map()
  private providerLastUsed: Map<string, number> = new Map()

  private constructor() {
    this.registerAdapter(new GeminiAdapter())
    this.registerAdapter(new GroqAdapter())
    this.registerAdapter(new CerebrasAdapter())
    this.registerAdapter(new OpenRouterAdapter())
    this.registerAdapter(new NvidiaAdapter())
    this.registerAdapter(new MistralAdapter())
    this.registerAdapter(new HuggingFaceAdapter())
    this.registerAdapter(new CohereAdapter())
    this.registerAdapter(new DeepSeekAdapter())
    this.registerAdapter(new CloudflareAdapter())
    this.registerAdapter(new PollinationsAdapter())
    this.registerAdapter(new KiloAdapter())
    this.registerAdapter(
      new OpenAICompatAdapter({
        id: 'custom',
        name: 'Custom OpenAI-Compatible Gateway',
        defaultBaseUrl: 'http://localhost:20128/v1',
        defaultModels: []
      })
    )

    this.restoreHealthFromDatabase()
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry()
    }
    return ProviderRegistry.instance
  }

  public static resetInstance(): void {
    ProviderRegistry.instance = null
  }

  /**
   * Restores persistent cooldowns, strikes, and last used timestamps from SQLite.
   */
  public restoreHealthFromDatabase(): void {
    try {
      const db = SqliteDatabase.getInstance()
      const now = Date.now()
      const rows = db
        .prepare(
          'SELECT key_id, provider_id, model_id, status, strikes, cooldown_until, last_error, last_used_at FROM provider_health'
        )
        .all() as Array<{
        key_id: string
        provider_id: string
        model_id: string | null
        status: string
        strikes: number
        cooldown_until: number
        last_error: string | null
        last_used_at: number
      }>

      for (const row of rows) {
        if (row.strikes > 0) {
          this.strikes.set(row.key_id, row.strikes)
        }
        if (row.last_used_at > 0) {
          const current = this.providerLastUsed.get(row.provider_id) || 0
          this.providerLastUsed.set(row.provider_id, Math.max(current, row.last_used_at))
        }
        if (row.cooldown_until > now) {
          if (row.model_id) {
            this.modelCooldowns.set(row.key_id, {
              cooldownUntilMs: row.cooldown_until,
              reason: row.last_error || undefined
            })
          } else {
            const state = this.keyStates.get(row.key_id) || {
              activeRequests: 0,
              maxConcurrency: 2,
              cooldownUntilMs: null
            }
            state.cooldownUntilMs = row.cooldown_until
            state.lastError = row.last_error || undefined
            this.keyStates.set(row.key_id, state)
          }
        }
      }
    } catch {
      // In isolated test environments or before migration, safely ignore
    }
  }

  public registerAdapter(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.id, adapter)
  }

  public getAdapter(id: ProviderId): IProviderAdapter | undefined {
    return this.adapters.get(id)
  }

  public getAllAdapters(): IProviderAdapter[] {
    return Array.from(this.adapters.values())
  }

  // --- Concurrency Lease Acquisition & Release ---

  public acquireLease(credentialId: string, modelId?: string, maxConcurrency = 2): boolean {
    const now = Date.now()

    // Check model-level cooldown first
    if (modelId) {
      const modelEntry = this.modelCooldowns.get(`${credentialId}::${modelId}`)
      if (modelEntry && modelEntry.cooldownUntilMs > now) {
        return false
      }
    }

    const state = this.keyStates.get(credentialId) || {
      activeRequests: 0,
      maxConcurrency,
      cooldownUntilMs: null
    }

    // Check credential cooldown
    if (state.cooldownUntilMs && state.cooldownUntilMs > now) {
      return false
    }

    // Check active concurrency
    if (state.activeRequests >= state.maxConcurrency) {
      return false
    }

    state.activeRequests++
    this.keyStates.set(credentialId, state)
    return true
  }

  public releaseLease(credentialId: string): void {
    const state = this.keyStates.get(credentialId)
    if (state && state.activeRequests > 0) {
      state.activeRequests--
      this.keyStates.set(credentialId, state)
    }
  }

  public setCooldown(credentialId: string, durationMs: number, reason?: string, modelId?: string): void {
    const statedMs = reason ? extractRetryDelayMs(reason) : undefined
    const keyId = modelId ? `${credentialId}::${modelId}` : credentialId
    const currentStrikes = (this.strikes.get(keyId) || 0) + 1
    this.strikes.set(keyId, currentStrikes)

    // Escalating backoff ladder when provider didn't specify Retry-After
    let effectiveDurationMs = statedMs !== undefined ? statedMs : durationMs
    if (statedMs === undefined && currentStrikes > 1) {
      const multiplier = Math.min(Math.pow(2, currentStrikes - 1), 16)
      effectiveDurationMs = Math.min(effectiveDurationMs * multiplier, 3600_000)
    }

    const cooldownUntilMs = Date.now() + effectiveDurationMs

    if (modelId) {
      this.modelCooldowns.set(keyId, {
        cooldownUntilMs,
        reason
      })
    } else {
      const state = this.keyStates.get(credentialId) || {
        activeRequests: 0,
        maxConcurrency: 2,
        cooldownUntilMs: null
      }
      state.cooldownUntilMs = cooldownUntilMs
      state.lastError = reason
      this.keyStates.set(credentialId, state)
    }

    // Always maintain lastError on keyState for UI observability
    const state = this.keyStates.get(credentialId) || {
      activeRequests: 0,
      maxConcurrency: 2,
      cooldownUntilMs: null
    }
    state.lastError = reason
    this.keyStates.set(credentialId, state)

    // Persist to SQLite provider_health ledger
    try {
      const db = SqliteDatabase.getInstance()
      const providerId = credentialId.includes('-') ? credentialId.split('-')[0] : credentialId
      db.prepare(`
        INSERT INTO provider_health (key_id, provider_id, model_id, status, strikes, cooldown_until, last_error, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key_id) DO UPDATE SET
          status = excluded.status,
          strikes = excluded.strikes,
          cooldown_until = excluded.cooldown_until,
          last_error = excluded.last_error,
          updated_at = excluded.updated_at
      `).run(
        keyId,
        providerId,
        modelId || null,
        'cooldown',
        currentStrikes,
        cooldownUntilMs,
        reason || null,
        new Date().toISOString()
      )
    } catch {
      // In isolated environments or tests, ignore
    }
  }

  public clearCooldown(credentialId: string, modelId?: string): void {
    const keyId = modelId ? `${credentialId}::${modelId}` : credentialId
    this.strikes.delete(keyId)

    if (modelId) {
      this.modelCooldowns.delete(keyId)
    }
    const state = this.keyStates.get(credentialId)
    if (state) {
      state.cooldownUntilMs = null
      state.lastError = undefined
      this.keyStates.set(credentialId, state)
    }

    try {
      const db = SqliteDatabase.getInstance()
      db.prepare(`
        UPDATE provider_health
        SET status = 'ok', cooldown_until = 0, strikes = 0, updated_at = ?
        WHERE key_id = ?
      `).run(new Date().toISOString(), keyId)
    } catch {
      // In isolated environments, ignore
    }
  }

  public recordProviderUsage(providerId: string): void {
    const now = Date.now()
    this.providerLastUsed.set(providerId, now)
    try {
      const db = SqliteDatabase.getInstance()
      db.prepare(`
        UPDATE provider_health
        SET last_used_at = ?, updated_at = ?
        WHERE provider_id = ?
      `).run(now, new Date().toISOString(), providerId)
    } catch {
      // Ignore
    }
  }

  public getProviderLastUsed(providerId: string): number {
    return this.providerLastUsed.get(providerId) || 0
  }

  public getStrikes(credentialId: string, modelId?: string): number {
    const keyId = modelId ? `${credentialId}::${modelId}` : credentialId
    return this.strikes.get(keyId) || 0
  }

  public clearAllModelCooldowns(credentialId: string): void {
    const prefix = `${credentialId}::`
    for (const key of this.modelCooldowns.keys()) {
      if (key.startsWith(prefix)) {
        this.modelCooldowns.delete(key)
      }
    }
  }

  public getCooldownExpiry(credentialId: string, modelId?: string): number | null {
    const now = Date.now()

    if (modelId) {
      // 1. Check model-scoped cooldown
      const modelEntry = this.modelCooldowns.get(`${credentialId}::${modelId}`)
      if (modelEntry) {
        if (modelEntry.cooldownUntilMs <= now) {
          this.modelCooldowns.delete(`${credentialId}::${modelId}`)
        } else {
          return modelEntry.cooldownUntilMs
        }
      }

      // 2. Check credential-wide cooldown (e.g. invalid API key)
      const state = this.keyStates.get(credentialId)
      if (state && state.cooldownUntilMs) {
        if (state.cooldownUntilMs <= now) {
          state.cooldownUntilMs = null
          return null
        }
        return state.cooldownUntilMs
      }
      return null
    }

    // No modelId specified: check credential-wide cooldown
    const state = this.keyStates.get(credentialId)
    if (state && state.cooldownUntilMs) {
      if (state.cooldownUntilMs <= now) {
        state.cooldownUntilMs = null
      } else {
        return state.cooldownUntilMs
      }
    }

    // Also check if any model cooldown is active for this credential
    const prefix = `${credentialId}::`
    let soonestModelCooldown: number | null = null
    for (const [key, entry] of this.modelCooldowns.entries()) {
      if (key.startsWith(prefix)) {
        if (entry.cooldownUntilMs <= now) {
          this.modelCooldowns.delete(key)
        } else {
          if (!soonestModelCooldown || entry.cooldownUntilMs < soonestModelCooldown) {
            soonestModelCooldown = entry.cooldownUntilMs
          }
        }
      }
    }

    return soonestModelCooldown
  }

  public getKeyState(credentialId: string): KeyLeaseState | undefined {
    return this.keyStates.get(credentialId)
  }

  // --- Pre-Flight Context Floor Filtering ---

  public passesContextWindowFloor(estimatedPromptTokens: number, model: ModelDescriptorDTO): boolean {
    // Leave at least 15% buffer for model response output
    const maxUsableContext = model.contextWindow - (model.outputLimit || 4096)
    return estimatedPromptTokens <= maxUsableContext
  }
}

