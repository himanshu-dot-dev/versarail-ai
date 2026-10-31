import { ProviderId, ModelDescriptorDTO } from '@shared/domain/models'
import { IProviderAdapter } from './provider-adapter.interface'
import { GeminiAdapter } from './gemini.adapter'
import { GroqAdapter } from './groq.adapter'
import { CerebrasAdapter } from './cerebras.adapter'
import { OpenRouterAdapter } from './openrouter.adapter'

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

  private constructor() {
    this.registerAdapter(new GeminiAdapter())
    this.registerAdapter(new GroqAdapter())
    this.registerAdapter(new CerebrasAdapter())
    this.registerAdapter(new OpenRouterAdapter())
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry()
    }
    return ProviderRegistry.instance
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

  public acquireLease(credentialId: string, maxConcurrency = 2): boolean {
    const now = Date.now()
    const state = this.keyStates.get(credentialId) || {
      activeRequests: 0,
      maxConcurrency,
      cooldownUntilMs: null
    }

    // Check cooldown
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

  public setCooldown(credentialId: string, durationMs: number, reason?: string): void {
    const state = this.keyStates.get(credentialId) || {
      activeRequests: 0,
      maxConcurrency: 2,
      cooldownUntilMs: null
    }
    state.cooldownUntilMs = Date.now() + durationMs
    state.lastError = reason
    this.keyStates.set(credentialId, state)
  }

  public getCooldownExpiry(credentialId: string): number | null {
    const state = this.keyStates.get(credentialId)
    if (!state || !state.cooldownUntilMs) return null
    if (state.cooldownUntilMs <= Date.now()) {
      state.cooldownUntilMs = null
      return null
    }
    return state.cooldownUntilMs
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

