import { ProviderId, ModelDescriptorDTO } from '@shared/domain/models'
import { ProviderRegistry } from '../providers/provider-registry'
import { SecretStorageService } from '../security/safe-storage.service'
import { SqliteDatabase } from '../storage/sqlite-database'
import { classifyProviderError, NormalizedProviderError } from './error-classifier'
import { InBandDetector } from '../providers/utils/in-band-detector'
import { formatResetEta, summarizeExhaustion, ModelExhaustionRecord } from '../providers/utils/reset-eta'
import { ChatMessage } from '../providers/provider-adapter.interface'
import { extractInlineToolCalls } from '../tools/builtin-tool-definitions'
import { repairToolArguments } from '../providers/utils/tool-repair'

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
  onToken: (chunk: { delta: string; isComplete: boolean; modelId?: string }) => void
  onFailover?: (event: FailoverEvent) => void
  onWaiting?: (info: { waitMs: number; resumesAt: string; reason: string }) => void
  _retryCount?: number
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
      id: 'gemini-3-flash-preview',
      providerId: 'gemini',
      name: 'Gemini 3.0 Flash Preview',
      contextWindow: 1048576,
      outputLimit: 65536,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'gemini-3.6-flash',
      providerId: 'gemini',
      name: 'Gemini 3.6 Flash',
      contextWindow: 1048576,
      outputLimit: 65536,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'gemini-3.5-flash',
      providerId: 'gemini',
      name: 'Gemini 3.5 Flash',
      contextWindow: 1048576,
      outputLimit: 65536,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'gemini-flash-latest',
      providerId: 'gemini',
      name: 'Gemini Flash Latest',
      contextWindow: 1048576,
      outputLimit: 65536,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  groq: [
    {
      id: 'openai/gpt-oss-120b',
      providerId: 'groq',
      name: 'OpenAI GPT-OSS 120B (Groq LPU)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'openai/gpt-oss-20b',
      providerId: 'groq',
      name: 'OpenAI GPT-OSS 20B (Groq LPU)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'qwen/qwen3.8-27b',
      providerId: 'groq',
      name: 'Qwen 3.8 27B (Groq LPU)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
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
      id: 'openrouter/free',
      providerId: 'openrouter',
      name: 'OpenRouter Free (Auto-Mesh)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'nvidia/nemotron-3.5-lightning:free',
      providerId: 'openrouter',
      name: 'Nvidia Nemotron 3.5 Lightning (Free)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      providerId: 'openrouter',
      name: 'Nvidia Nemotron 3 Ultra 550B (Free)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'cohere/north-mini-code:free',
      providerId: 'openrouter',
      name: 'Cohere North Mini Code (Free)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'google/gemma-4-31b-it:free',
      providerId: 'openrouter',
      name: 'Google Gemma 4 31B (Free)',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      providerId: 'openrouter',
      name: 'Meta Llama 3.3 70B Instruct',
      contextWindow: 131072,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: false
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      providerId: 'openrouter',
      name: 'Meta Llama 3.3 70B (Free)',
      contextWindow: 131072,
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
      isFreeTierAvailable: false
    },
    {
      id: 'Qwen/Qwen3.8-27B',
      providerId: 'huggingface',
      name: 'Hugging Face Qwen 3.8 27B',
      contextWindow: 65536,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: false
    },
    {
      id: 'deepseek-ai/DeepSeek-V4.1-Flash',
      providerId: 'huggingface',
      name: 'Hugging Face DeepSeek V4.1 Flash',
      contextWindow: 128000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: false
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
      name: 'Pollinations GPT-OSS 20B (Keyless)',
      contextWindow: 128000,
      outputLimit: 4096,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    }
  ],
  kilo: [
    {
      id: 'kilo-auto/free',
      providerId: 'kilo',
      name: 'Kilo Auto Free (Rotates Free Models)',
      contextWindow: 256000,
      outputLimit: 8192,
      supportsTools: true,
      supportsStreaming: true,
      isFreeTierAvailable: true
    },
    {
      id: 'nvidia/nemotron-3.5-super-vl:free',
      providerId: 'kilo',
      name: 'NVIDIA Nemotron 3.5 Super VL (Free)',
      contextWindow: 1000000,
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
    let preferredModelId = options.preferredModelId
    if (
      preferredModelId === 'gemini-2.5-flash' ||
      preferredModelId === 'gemini-2.5-pro' ||
      preferredModelId === 'gemini-2.0-flash' ||
      preferredModelId === 'gemini-2.5-flash-lite'
    ) {
      preferredModelId = 'gemini-3-flash-preview'
    }

    const configuredCreds = [...this.secretStore.listCredentialMetadata()]

    // Auto-enable keyless providers (e.g. Kilo, Pollinations) as fallback candidates unconditionally
    const KEYLESS_PROVIDERS: Array<{ id: ProviderId; credId: string; label: string }> = [
      { id: 'kilo', credId: 'kilo-keyless', label: 'Kilo Gateway (Keyless Free)' },
      { id: 'pollinations', credId: 'pollinations-keyless', label: 'Pollinations (Keyless Free)' }
    ]

    for (const kp of KEYLESS_PROVIDERS) {
      if (!configuredCreds.some((c) => c.providerId === kp.id)) {
        configuredCreds.push({
          id: kp.credId,
          providerId: kp.id,
          label: kp.label,
          maskedKey: 'Keyless (Free)',
          isSessionOnly: false,
          createdAt: new Date().toISOString()
        })
      }
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

    const isAutoPolicy =
      (options.preferredProviderId as string) === 'auto' ||
      (options.preferredProviderId as string) === 'universal' ||
      (!options.preferredProviderId && preferredModelId?.startsWith('auto/'))

    for (const cred of configuredCreds) {
      const providerId = cred.providerId as ProviderId

      // Skip disabled credentials unless explicitly requested as user's preferred provider
      const isPreferred = cred.providerId === options.preferredProviderId
      if (!isPreferred && disabledCredIds.has(cred.id)) {
        continue
      }

      // Check allowed providers:
      // 1. If user explicitly chose this provider as preferred in chat, ALWAYS honor explicit intent!
      // 2. If it's a keyless free tier, allow it for auto policy so free mesh never dies.
      // 3. Otherwise, check against options.allowedProviders whitelist.
      const isKeyless = providerId === 'pollinations' || providerId === 'kilo'
      if (!isPreferred && !(isAutoPolicy && isKeyless) && options.allowedProviders && !options.allowedProviders.includes(providerId)) {
        continue
      }

      const availableModels = [...(DEFAULT_PROVIDER_MODELS[providerId] || [])]

      // Dynamic discovery / user preference injection:
      // If user requested a model (e.g. from OmniRoute dynamic discovery or combo)
      // that isn't in default list, add it so execution proceeds
      if (preferredModelId && (providerId === options.preferredProviderId || availableModels.length === 0)) {
        if (!availableModels.some((m) => m.id === preferredModelId)) {
          availableModels.unshift({
            id: preferredModelId,
            providerId,
            name: preferredModelId,
            contextWindow: 128000,
            outputLimit: 8192,
            supportsTools: true,
            supportsStreaming: true,
            isFreeTierAvailable: false
          })
        }
      }

      for (const m of availableModels) {
        // Virtual free policy: when auto/free is requested, enforce free tier availability
        if (preferredModelId === 'auto/free' && m.isFreeTierAvailable === false) {
          continue
        }

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
    // 1. User preferred model first (if not an auto virtual model policy)
    // 2. Candidates not in cooldown before candidates currently in cooldown
    // 3. Provider-level LRU rotation across active healthy providers for auto/free mesh
    // 4. Provider priority preference (Gemini/Groq -> Cerebras -> Nvidia -> Mistral...)
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
      kilo: 9,
      pollinations: 10,
      openrouter: 11,
      huggingface: 12,
      custom: 13
    }

    return rawCandidates.sort((a, b) => {
      // 1. User explicit preference match (only if not an auto policy)
      if (!isAutoPolicy) {
        const aIsPreferred = a.providerId === options.preferredProviderId && a.modelId === preferredModelId
        const bIsPreferred = b.providerId === options.preferredProviderId && b.modelId === preferredModelId
        if (aIsPreferred && !bIsPreferred) return -1
        if (!aIsPreferred && bIsPreferred) return 1
      }

      // 2. Cooldown check: healthy candidates before cooling candidates
      const aCooldown = this.registry.getCooldownExpiry(a.credentialId, a.modelId)
      const bCooldown = this.registry.getCooldownExpiry(b.credentialId, b.modelId)
      const aInCooldown = aCooldown !== null && aCooldown > now
      const bInCooldown = bCooldown !== null && bCooldown > now

      if (!aInCooldown && bInCooldown) return -1
      if (aInCooldown && !bInCooldown) return 1

      // 3. For auto policies among healthy candidates: Provider-level LRU rotation!
      if (isAutoPolicy && !aInCooldown && !bInCooldown) {
        if (a.providerId !== b.providerId) {
          const aUsed = this.registry.getProviderLastUsed(a.providerId)
          const bUsed = this.registry.getProviderLastUsed(b.providerId)
          if (aUsed !== bUsed) {
            return aUsed - bUsed // Least recently used provider first
          }
        }
      }

      // 4. Provider priority
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

      // Check if user explicitly requested this exact provider + model (with alias tolerance)
      const isUserPreferred =
        options.preferredProviderId === candidate.providerId &&
        (options.preferredModelId === candidate.modelId ||
          (candidate.modelId === 'gemini-3-flash-preview' && options.preferredModelId?.startsWith('gemini-2.')))

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
      const hasLease = this.registry.acquireLease(candidate.credentialId, candidate.modelId)
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

        const accumulatedToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()

        for await (const chunk of stream) {
          if (signal?.aborted) {
            throw new Error('Generation cancelled by user')
          }

          if (chunk.toolCallsDelta) {
            for (const tc of chunk.toolCallsDelta) {
              const idx = typeof tc.index === 'number' ? tc.index : 0
              const existing = accumulatedToolCalls.get(idx) || {
                id: tc.id || `call_${idx}`,
                name: tc.name || '',
                arguments: ''
              }
              if (tc.id) existing.id = tc.id
              if (tc.name) existing.name = tc.name
              if (tc.arguments) existing.arguments += tc.arguments
              accumulatedToolCalls.set(idx, existing)
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
              isComplete: false,
              modelId: candidate.modelId
            })
          }
        }

        // Check for inline tool calls in text
        const inlineCalls = extractInlineToolCalls(fullResponse)
        const detectedToolCalls: Array<{ id: string; name: string; arguments: string }> = []

        if (accumulatedToolCalls.size > 0) {
          for (const tc of accumulatedToolCalls.values()) {
            if (tc.name) {
              detectedToolCalls.push({
                id: tc.id,
                name: tc.name,
                arguments: repairToolArguments(tc.arguments)
              })
            }
          }
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
        this.registry.recordProviderUsage(candidate.providerId)
        // Only signal completion if no more tool calls need to be processed
        onToken({ delta: '', isComplete: detectedToolCalls.length === 0 })

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

        // Set realistic cooldowns: auth failures and quota exhaustion do not resolve in 45s
        let cooldownDurationMs: number
        if (normalized.kind === 'authentication_failed') {
          cooldownDurationMs = 60 * 60 * 1000 // 1 hour
        } else if (normalized.kind === 'quota_exhausted') {
          cooldownDurationMs = 60 * 60 * 1000 // 1 hour
        } else {
          cooldownDurationMs = normalized.retryAfterMs || 45000
        }

        const cooldownExpiryTime = Date.now() + cooldownDurationMs

        // Granular cooldown: model-level unless credential fails authentication or quota globally
        const cooldownModelId =
          normalized.kind === 'authentication_failed' || normalized.kind === 'quota_exhausted'
            ? undefined
            : candidate.modelId
        this.registry.setCooldown(candidate.credentialId, cooldownDurationMs, normalized.clientSafeMessage, cooldownModelId)

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

    // Check for The All-Cooling Wait State:
    // If all candidates failed because of rate limits or cooldowns, do not kill the task!
    // Sleep until the earliest cooldown expires, then retry automatically.
    const retryCount = options._retryCount || 0
    const allCooling =
      exhaustionRecords.length > 0 &&
      exhaustionRecords.every((r) => r.reason === 'cooldown' || r.reason === 'rate_limit')

    const resetTimes = exhaustionRecords
      .map((r) => r.resetAt)
      .filter((t): t is number => typeof t === 'number' && !isNaN(t))

    if (allCooling && retryCount < 2 && !signal?.aborted && resetTimes.length > 0) {
      const minResetAt = Math.min(...resetTimes)
      const waitMs = minResetAt - Date.now()
      const effectiveWaitMs = Math.max(0, waitMs)
      const MAX_WAIT_MS = 60_000 // wait up to 60 seconds

      if (effectiveWaitMs <= MAX_WAIT_MS) {
        const waitSec = Math.max(1, Math.ceil(effectiveWaitMs / 1000))
        console.warn(
          `[FailoverEngine] All providers temporarily cooling. Pausing for ${waitSec}s until reset at ${new Date(minResetAt).toLocaleTimeString()}...`
        )

        const waitNotice = `\n\n> ⏳ **Rate limit cooldown:** Upstream rate limits reached. Resuming automatically in ${waitSec}s...\n\n`
        onToken({ delta: waitNotice, isComplete: false })

        if (options.onWaiting) {
          options.onWaiting({
            waitMs: effectiveWaitMs,
            resumesAt: new Date(minResetAt).toLocaleTimeString(),
            reason: 'All candidate models cooling'
          })
        }

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, effectiveWaitMs + 300)
          if (signal) {
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer)
                reject(new Error('Generation cancelled by user'))
              },
              { once: true }
            )
          }
        })

        // Retry streaming with refreshed candidate list / cooldown states
        return this.executeStreaming({
          ...options,
          _retryCount: retryCount + 1
        })
      }
    }

    // All candidate models exhausted and cannot wait
    const exhaustionMessage = summarizeExhaustion(exhaustionRecords)
    throw new Error(exhaustionMessage)
  }
}
