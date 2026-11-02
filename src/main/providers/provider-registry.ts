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
    const effectiveDurationMs = statedMs !== undefined ? statedMs : durationMs
    const cooldownUntilMs = Date.now() + effectiveDurationMs

    if (modelId) {
      this.modelCooldowns.set(`${credentialId}::${modelId}`, {
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
  }

  public clearCooldown(credentialId: string, modelId?: string): void {
    if (modelId) {
      this.modelCooldowns.delete(`${credentialId}::${modelId}`)
    }
    const state = this.keyStates.get(credentialId)
    if (state) {
      state.cooldownUntilMs = null
      state.lastError = undefined
      this.keyStates.set(credentialId, state)
    }
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

