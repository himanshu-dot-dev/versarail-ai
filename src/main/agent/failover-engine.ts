import { ProviderId, ModelDescriptorDTO } from '@shared/domain/models'
import { ProviderRegistry } from '../providers/provider-registry'
import { SecretStorageService } from '../security/safe-storage.service'
import { SqliteDatabase } from '../storage/sqlite-database'
import { classifyProviderError, NormalizedProviderError } from './error-classifier'
import { InBandDetector } from '../providers/utils/in-band-detector'
import { formatResetEta, summarizeExhaustion, ModelExhaustionRecord } from '../providers/utils/reset-eta'
import { ChatMessage } from '../providers/provider-adapter.interface'
import { extractInlineToolCalls } from '../tools/builtin-tool-definitions'

export interface CandidateModel {
  providerId: ProviderId
  modelId: string
  credentialId: string
  customEndpoint?: string
  contextWindow: number
  outputLimit: number
  supportsTools: boolean
}

export interface CandidateSelectionOptions {
  preferredProviderId: ProviderId
  preferredModelId: string
  estimatedPromptTokens?: number
  requiresTools?: boolean
  allowedProviders?: ProviderId[]
}

export interface FailoverEvent {
  runId?: string
  fromProvider: ProviderId
  toProvider: ProviderId
  fromModel: string
  toModel: string
  reason: string
  isSilent: boolean
  resetEta?: string | null
}

export interface FailoverExecutionOptions {
  runId?: string
  candidates: CandidateModel[]
  messages: ChatMessage[]
  signal?: AbortSignal
  preferredProviderId?: ProviderId
  preferredModelId?: string
  tools?: any[]
  onToken: (chunk: { delta: string; isComplete: boolean }) => void
  onFailover?: (event: FailoverEvent) => void
}

export interface FailoverExecutionResult {
  fullResponse: string
  finalProviderId: ProviderId
  finalModelId: string
  wasFailoverTriggered: boolean
  failoverCount: number
  toolCalls?: Array<{
    id: string
    name: string
    arguments: string
  }>
}

// Fallback Model Catalog for all supported adapters
const DEFAULT_PROVIDER_MODELS: Record<ProviderId, ModelDescriptorDTO[]> = {
  gemini: [
    {
      id: 'gemini-2.5-flash',
      providerId: 'gemini',
      name: 'Gemini 2.5 Flash',
      contextWindow: 1000000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'gemini-2.5-pro',
      providerId: 'gemini',
      name: 'Gemini 2.5 Pro',
      contextWindow: 2000000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      providerId: 'groq',
      name: 'Llama 3.3 70B Versatile',
      contextWindow: 128000,
      outputLimit: 32768,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'llama-3.1-8b-instant',
      providerId: 'groq',
      name: 'Llama 3.1 8B Instant',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  cerebras: [
    {
      id: 'llama3.3-70b',
      providerId: 'cerebras',
      name: 'Cerebras Llama 3.3 70B',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'llama3.1-8b',
      providerId: 'cerebras',
      name: 'Cerebras Llama 3.1 8B',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  openrouter: [
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      providerId: 'openrouter',
      name: 'Meta Llama 3.3 70B (Free)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'google/gemini-2.0-flash-exp:free',
      providerId: 'openrouter',
      name: 'Gemini 2.0 Flash Exp (Free)',
      contextWindow: 1048576,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  custom: [
    {
      id: 'auto/gpt',
      providerId: 'custom',
      name: 'OmniRoute Auto (GPT)',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: false
    },
    {
      id: 'auto/best-coding',
      providerId: 'custom',
      name: 'OmniRoute Auto (Best Coding)',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: false
    },
    {
      id: 'auto/fast',
      providerId: 'custom',
      name: 'OmniRoute Auto (Fast)',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: false
    },
    {
      id: 'auto/best-reasoning',
      providerId: 'custom',
      name: 'OmniRoute Auto (Best Reasoning)',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: false
    },
    {
      id: 'auto/chat',
      providerId: 'custom',
      name: 'OmniRoute Auto (General Chat)',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: false
    }
  ],
  nvidia: [
    {
      id: 'meta/llama-3.3-70b-instruct',
      providerId: 'nvidia',
      name: 'NVIDIA Llama 3.3 70B Instruct',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'deepseek-ai/deepseek-r1',
      providerId: 'nvidia',
      name: 'NVIDIA DeepSeek R1',
      contextWindow: 131072,
      outputLimit: 16384,
      supportsTools: false,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  mistral: [
    {
      id: 'codestral-latest',
      providerId: 'mistral',
      name: 'Codestral 2501 (Code Engine)',
      contextWindow: 256000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'mistral-small-latest',
      providerId: 'mistral',
      name: 'Mistral Small (Fast)',
      contextWindow: 32768,
      outputLimit: 4096,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  huggingface: [
    {
      id: 'meta-llama/Llama-3.3-70B-Instruct',
      providerId: 'huggingface',
      name: 'Hugging Face Llama 3.3 70B',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
      providerId: 'huggingface',
      name: 'Hugging Face Qwen 2.5 Coder 32B',
      contextWindow: 32768,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  cohere: [
    {
      id: 'command-r-plus-08-2024',
      providerId: 'cohere',
      name: 'Cohere Command R+',
      contextWindow: 128000,
      outputLimit: 4096,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'command-r-08-2024',
      providerId: 'cohere',
      name: 'Cohere Command R',
      contextWindow: 128000,
      outputLimit: 4096,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  deepseek: [
    {
      id: 'deepseek-ai/DeepSeek-V3',
      providerId: 'deepseek',
      name: 'DeepSeek V3 (Chat & Coding)',
      contextWindow: 65536,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'deepseek-ai/DeepSeek-R1',
      providerId: 'deepseek',
      name: 'DeepSeek R1 (Reasoning)',
      contextWindow: 65536,
      outputLimit: 8192,
      supportsTools: false,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  cloudflare: [
    {
      id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      providerId: 'cloudflare',
      name: 'Cloudflare Llama 3.3 70B Fast',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: '@cf/qwen/qwen2.5-coder-32b-instruct',
      providerId: 'cloudflare',
      name: 'Cloudflare Qwen 2.5 Coder 32B',
      contextWindow: 32768,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  pollinations: [
    {
      id: 'openai',
      providerId: 'pollinations',
      name: 'Pollinations GPT-4o (Keyless)',
      contextWindow: 128000,
      outputLimit: 4096,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'deepseek-r1',
      providerId: 'pollinations',
      name: 'Pollinations DeepSeek R1 (Keyless)',
      contextWindow: 65536,
      outputLimit: 8192,
      supportsTools: false,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  kilo: [
    {
      id: 'deepseek/deepseek-r1:free',
      providerId: 'kilo',
      name: 'Kilo DeepSeek R1 (Free)',
      contextWindow: 65536,
      outputLimit: 8192,
      supportsTools: false,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      providerId: 'kilo',
      name: 'Kilo Llama 3.3 70B (Free)',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ]
}

export class FailoverEngine {
  private static instance: FailoverEngine | null = null
  private registry: ProviderRegistry
  private secretStore: SecretStorageService

  private constructor() {
    this.registry = ProviderRegistry.getInstance()
    this.secretStore = SecretStorageService.getInstance()
  }

  public static getInstance(): FailoverEngine {
    if (!FailoverEngine.instance) {
      FailoverEngine.instance = new FailoverEngine()
    }
    return FailoverEngine.instance
  }

  /**
   * Discovers and ranks candidate models according to configured credentials,
   * tool capabilities, pre-flight context window requirements, and cooldown states.
   */
  public getCandidateModels(options: CandidateSelectionOptions): CandidateModel[] {
    const configuredCreds = [...this.secretStore.listCredentialMetadata()]

    // Auto-enable keyless providers (e.g. Pollinations, Kilo) if preferred or configured
    if (
      options.preferredProviderId === 'pollinations' &&
      !configuredCreds.some((c) => c.providerId === 'pollinations')
    ) {
      configuredCreds.push({
        id: 'pollinations-keyless',
        providerId: 'pollinations',
        label: 'Pollinations (Keyless Free)',
        maskedKey: 'Keyless (Free)',
        isSessionOnly: false,
        createdAt: new Date().toISOString()
      })
    } else if (
      options.preferredProviderId === 'kilo' &&
      !configuredCreds.some((c) => c.providerId === 'kilo')
    ) {
      configuredCreds.push({
        id: 'kilo-keyless',
        providerId: 'kilo',
        label: 'Kilo Gateway (Keyless Free)',
        maskedKey: 'Keyless (Free)',
        isSessionOnly: false,
        createdAt: new Date().toISOString()
      })
    }

    if (configuredCreds.length === 0) {
      return []
    }

    const estimatedTokens = options.estimatedPromptTokens || 0
    const rawCandidates: CandidateModel[] = []

    const disabledCredIds = new Set<string>()
    try {
      const db = SqliteDatabase.getInstance()
      const rows = db.prepare('SELECT id FROM provider_metadata WHERE enabled = 0').all() as Array<{ id: string }>
      for (const row of rows) {
        disabledCredIds.add(row.id)
      }
    } catch {
      // In isolated tests without full database initialization, ignore
    }

    for (const cred of configuredCreds) {
      const providerId = cred.providerId as ProviderId

      // Skip disabled credentials unless explicitly requested as user's preferred provider
      const isPreferred = cred.providerId === options.preferredProviderId
      if (!isPreferred && disabledCredIds.has(cred.id)) {
        continue
      }

      if (options.allowedProviders && !options.allowedProviders.includes(providerId)) {
        continue
      }

      const availableModels = [...(DEFAULT_PROVIDER_MODELS[providerId] || [])]

      // Dynamic discovery / user preference injection:
      // If user requested a model (e.g. from OmniRoute dynamic discovery or combo)
      // that isn't in default list, add it so execution proceeds
      if (options.preferredModelId && (providerId === options.preferredProviderId || availableModels.length === 0)) {
        if (!availableModels.some((m) => m.id === options.preferredModelId)) {
          availableModels.unshift({
            id: options.preferredModelId,
            providerId,
            name: options.preferredModelId,
            contextWindow: 128000,
            outputLimit: 8192,
            supportsTools: true,
            supportsStreaming: true,
            isFreeTierAvailable: false
          })
        }
      }

      for (const m of availableModels) {
        // Pre-Flight Context Floor Filtering:
        // Skip models whose usable context cannot fit the prompt
        if (estimatedTokens > 0 && !this.registry.passesContextWindowFloor(estimatedTokens, m)) {
          continue
        }

        // Tool capability filtering
        if (options.requiresTools && !m.supportsTools) {
          continue
        }

        rawCandidates.push({
          providerId,
          modelId: m.id,
          credentialId: cred.id,
          customEndpoint: cred.customEndpoint,
          contextWindow: m.contextWindow,
          outputLimit: m.outputLimit,
          supportsTools: m.supportsTools
        })
      }
    }

    // Sort Candidates:
    // 1. User preferred model first
    // 2. Candidates not in cooldown before candidates currently in cooldown
    // 3. Provider priority preference (Gemini/Groq -> Cerebras -> OpenRouter)
    const now = Date.now()
    const providerPriority: Record<ProviderId, number> = {
      gemini: 1,
      groq: 2,
      cerebras: 3,
      nvidia: 4,
      mistral: 5,
      deepseek: 6,
      cloudflare: 7,
      cohere: 8,
      pollinations: 9,
      kilo: 10,
      openrouter: 11,
      huggingface: 12,
      custom: 13
    }

    return rawCandidates.sort((a, b) => {
      // 1. User preference match
      const aIsPreferred = a.providerId === options.preferredProviderId && a.modelId === options.preferredModelId
      const bIsPreferred = b.providerId === options.preferredProviderId && b.modelId === options.preferredModelId
      if (aIsPreferred && !bIsPreferred) return -1
      if (!aIsPreferred && bIsPreferred) return 1

      // 2. Cooldown check
      const aCooldown = this.registry.getCooldownExpiry(a.credentialId, a.modelId)
      const bCooldown = this.registry.getCooldownExpiry(b.credentialId, b.modelId)
      const aInCooldown = aCooldown !== null && aCooldown > now
      const bInCooldown = bCooldown !== null && bCooldown > now

      if (!aInCooldown && bInCooldown) return -1
      if (aInCooldown && !bInCooldown) return 1

      // 3. Provider priority
      const aPrio = providerPriority[a.providerId] ?? 99
      const bPrio = providerPriority[b.providerId] ?? 99
      return aPrio - bPrio
    })
  }

  /**
   * Executes streaming completion with Dead-Turn Pre-First-Byte Failover.
   * If an error occurs before any token reaches the renderer, transparently
   * falls over to the next candidate model in the chain.
   */
  public async executeStreaming(options: FailoverExecutionOptions): Promise<FailoverExecutionResult> {
    const { candidates, messages, signal, runId, onToken, onFailover } = options
    if (candidates.length === 0) {
      throw new Error('No eligible candidate models available to handle this request.')
    }

    const exhaustionRecords: ModelExhaustionRecord[] = []
    let failoverCount = 0

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const nextCandidate = candidates[i + 1]

      if (signal?.aborted) {
        throw new Error('Generation cancelled by user')
      }

      // Check if user explicitly requested this exact provider + model
      const isUserPreferred =
        options.preferredProviderId === candidate.providerId &&
        options.preferredModelId === candidate.modelId

      // Check active cooldown (user's explicit preference is never skipped on intentional send)
      const cooldownExpiry = this.registry.getCooldownExpiry(candidate.credentialId, candidate.modelId)
      if (!isUserPreferred && cooldownExpiry && cooldownExpiry > Date.now()) {
        exhaustionRecords.push({
          modelId: candidate.modelId,
          provider: candidate.providerId,
          reason: 'cooldown',
          resetAt: cooldownExpiry
        })
        continue
      }

      // Concurrency lease check
      const hasLease = this.registry.acquireLease(candidate.credentialId)
      if (!hasLease) {
        exhaustionRecords.push({
          modelId: candidate.modelId,
          provider: candidate.providerId,
          reason: 'rate_limit',
          resetAt: Date.now() + 5000
        })
        continue
      }

      let hasStreamedFirstByte = false
      let fullResponse = ''

      try {
        let apiKey = await this.secretStore.getDecryptedKey(candidate.credentialId)
        if (!apiKey && (candidate.providerId === 'pollinations' || candidate.providerId === 'kilo')) {
          apiKey = 'no-key'
        }
        if (!apiKey) {
          throw new Error(`Failed to decrypt credentials for provider "${candidate.providerId}"`)
        }

        const adapter = this.registry.getAdapter(candidate.providerId)
        if (!adapter) {
          throw new Error(`No adapter found for provider "${candidate.providerId}"`)
        }

        const stream = adapter.streamCompletion({
          apiKey,
          model: candidate.modelId,
          messages,
          signal,
          customEndpoint: candidate.customEndpoint,
          tools: options.tools
        })

        const accumulatedToolCalls: Map<string, { id: string; name: string; arguments: string }> = new Map()

        for await (const chunk of stream) {
          if (signal?.aborted) {
            throw new Error('Generation cancelled by user')
          }

          if (chunk.toolCallsDelta) {
            for (const tc of chunk.toolCallsDelta) {
              const key = tc.id || tc.name || 'call_0'
              const existing = accumulatedToolCalls.get(key) || {
                id: tc.id || key,
                name: tc.name || '',
                arguments: ''
              }
              if (tc.name) existing.name = tc.name
              if (tc.arguments) existing.arguments += tc.arguments
              accumulatedToolCalls.set(key, existing)
            }
            hasStreamedFirstByte = true
          }

          if (chunk.textDelta) {
            // First byte in-band anomaly detection
            if (!hasStreamedFirstByte) {
              const inBandErr = InBandDetector.getMatch(chunk.textDelta)
              if (inBandErr) {
                throw new Error(`In-band provider anomaly: ${inBandErr}`)
              }
              hasStreamedFirstByte = true
            }

            fullResponse += chunk.textDelta
            onToken({
              delta: chunk.textDelta,
              isComplete: false
            })
          }
        }

        // Check for inline tool calls in text
        const inlineCalls = extractInlineToolCalls(fullResponse)
        const detectedToolCalls: Array<{ id: string; name: string; arguments: string }> = []

        if (accumulatedToolCalls.size > 0) {
          detectedToolCalls.push(...Array.from(accumulatedToolCalls.values()))
        } else if (inlineCalls.length > 0) {
          detectedToolCalls.push(
            ...inlineCalls.map((c) => ({
              id: c.id,
              name: c.name,
              arguments: JSON.stringify(c.args)
            }))
          )
        }

        // If stream ended with 0 tokens or only empty whitespace
        if (!hasStreamedFirstByte || (!fullResponse.trim() && detectedToolCalls.length === 0)) {
          throw new Error(
            `Upstream provider ${candidate.providerId} (${candidate.modelId}) closed stream without producing any response. Verify upstream quota, API key, and model availability.`
          )
        }

        // Successfully completed stream
        this.registry.releaseLease(candidate.credentialId)
        this.registry.clearCooldown(candidate.credentialId, candidate.modelId)
        onToken({ delta: '', isComplete: true })

        return {
          fullResponse,
          finalProviderId: candidate.providerId,
          finalModelId: candidate.modelId,
          wasFailoverTriggered: failoverCount > 0,
          failoverCount,
          toolCalls: detectedToolCalls.length > 0 ? detectedToolCalls : undefined
        }
      } catch (err: unknown) {
        this.registry.releaseLease(candidate.credentialId)

        if (signal?.aborted) {
          throw err
        }

        const normalized: NormalizedProviderError = classifyProviderError(err, candidate.providerId)
        const cooldownDuration = normalized.retryAfterMs || 45000
        const cooldownExpiryTime = Date.now() + cooldownDuration

        // Granular cooldown: model-level unless credential fails authentication globally
        const cooldownModelId = normalized.kind === 'authentication_failed' ? undefined : candidate.modelId
        this.registry.setCooldown(candidate.credentialId, cooldownDuration, normalized.clientSafeMessage, cooldownModelId)

        exhaustionRecords.push({
          modelId: candidate.modelId,
          provider: candidate.providerId,
          reason: normalized.kind === 'quota_exhausted' ? 'quota_exhausted' : 'rate_limit',
          resetAt: cooldownExpiryTime
        })

        // DEAD-TURN RECOVERY (ADR-009):
        // If error occurred BEFORE first byte was streamed, we can silently failover!
        if (!hasStreamedFirstByte && normalized.isFallbackEligible && nextCandidate) {
          failoverCount++
          console.warn(
            `[FailoverEngine] Dead-turn failover from ${candidate.providerId} (${candidate.modelId}) to ${nextCandidate.providerId} (${nextCandidate.modelId}). Reason: ${normalized.clientSafeMessage}`
          )

          if (onFailover) {
            onFailover({
              runId,
              fromProvider: candidate.providerId,
              toProvider: nextCandidate.providerId,
              fromModel: candidate.modelId,
              toModel: nextCandidate.modelId,
              reason: normalized.clientSafeMessage,
              isSilent: true,
              resetEta: formatResetEta(cooldownExpiryTime)
            })
          }

          // Continue loop to try nextCandidate
          continue
        }

        // If first byte was already streamed, silent failover is prohibited to prevent corrupting text
        if (hasStreamedFirstByte) {
          if (onFailover && nextCandidate) {
            onFailover({
              runId,
              fromProvider: candidate.providerId,
              toProvider: nextCandidate.providerId,
              fromModel: candidate.modelId,
              toModel: nextCandidate.modelId,
              reason: normalized.clientSafeMessage,
              isSilent: false,
              resetEta: formatResetEta(cooldownExpiryTime)
            })
          }
          throw new Error(
            `Stream interrupted after partial response from ${candidate.providerId}: ${normalized.clientSafeMessage}`
          )
        }

        // If no more candidates exist or error is not fallback eligible
        throw new Error(normalized.clientSafeMessage)
      }
    }

    // All candidate models exhausted
    const exhaustionMessage = summarizeExhaustion(exhaustionRecords)
    throw new Error(exhaustionMessage)
  }
}
