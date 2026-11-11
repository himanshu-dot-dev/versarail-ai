import { ProviderId } from '@shared/domain/models'
import { SqliteDatabase } from '../storage/sqlite-database'
import { SecretStorageService } from '../security/safe-storage.service'

export interface ProviderModelBudgetSpec {
  providerId: ProviderId
  modelId: string
  displayName: string
  monthlyTokenBudget: string
  quotaPoolKey: string
  tpdLimit: number | null
}

export const PROVIDER_DISPLAY_NAMES: Record<ProviderId, string> = {
  gemini: 'Google AI Studio',
  groq: 'GroqCloud LPU',
  cerebras: 'Cerebras Cloud',
  openrouter: 'OpenRouter',
  nvidia: 'NVIDIA NIM',
  mistral: 'Mistral AI',
  deepseek: 'DeepSeek / SiliconFlow',
  cloudflare: 'Cloudflare Workers AI',
  cohere: 'Cohere',
  huggingface: 'Hugging Face',
  pollinations: 'Pollinations.ai',
  kilo: 'Kilo Gateway',
  custom: 'Custom Endpoint'
}

export function inferQuotaPoolKey(
  providerId: string,
  modelId?: string | null,
  customEndpoint?: string | null
): string {
  const normModel = (modelId || '').trim()
  switch (providerId) {
    case 'gemini':
      return 'gemini::ai-studio'
    case 'groq':
      return normModel ? `groq::${normModel}` : 'groq::account'
    case 'cerebras':
      return 'cerebras::shared'
    case 'openrouter':
      return 'openrouter::free'
    case 'mistral':
      return 'mistral::experiment-pool'
    case 'nvidia':
      return 'nvidia::rate-limited'
    case 'deepseek':
      return 'deepseek::siliconflow'
    case 'cloudflare':
      return 'cloudflare::account'
    case 'cohere':
      return 'cohere::trial-pool'
    case 'huggingface':
      return 'huggingface::router'
    case 'kilo':
      return 'kilo::anonymous'
    case 'pollinations':
      return 'pollinations::account'
    case 'custom': {
      const normalized = (customEndpoint || '').trim().replace(/\/+$/, '')
      return normalized ? `custom::${normalized}` : 'custom::local'
    }
    default:
      return normModel ? `${providerId}::${normModel}` : `${providerId}::account`
  }
}

/**
 * Free-tier token budget specifications per provider & model (aligned with FreeLLMAPI & provider free-tier docs).
 */
export const PROVIDER_MODEL_BUDGET_SPECS: ProviderModelBudgetSpec[] = [
  // Google AI Studio (shared account pool ~120M/mo across Gemini models)
  {
    providerId: 'gemini',
    modelId: 'gemini-3-flash-preview',
    displayName: 'Gemini 3.0 Flash Preview',
    monthlyTokenBudget: '~120M',
    quotaPoolKey: 'gemini::ai-studio',
    tpdLimit: null
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-3.6-flash',
    displayName: 'Gemini 3.6 Flash',
    monthlyTokenBudget: '~120M',
    quotaPoolKey: 'gemini::ai-studio',
    tpdLimit: null
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    monthlyTokenBudget: '~120M',
    quotaPoolKey: 'gemini::ai-studio',
    tpdLimit: null
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-flash-latest',
    displayName: 'Gemini Flash Latest',
    monthlyTokenBudget: '~120M',
    quotaPoolKey: 'gemini::ai-studio',
    tpdLimit: null
  },

  // GroqCloud (per-model daily token caps -> TPD * 30)
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-120b',
    displayName: 'OpenAI GPT-OSS 120B (Groq LPU)',
    monthlyTokenBudget: 'free · 200K tokens/day',
    quotaPoolKey: 'groq::openai/gpt-oss-120b',
    tpdLimit: 200_000
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-20b',
    displayName: 'OpenAI GPT-OSS 20B (Groq LPU)',
    monthlyTokenBudget: 'free · 200K tokens/day',
    quotaPoolKey: 'groq::openai/gpt-oss-20b',
    tpdLimit: 200_000
  },
  {
    providerId: 'groq',
    modelId: 'qwen/qwen3.8-27b',
    displayName: 'Qwen 3.8 27B (Groq LPU)',
    monthlyTokenBudget: 'free · 500K tokens/day',
    quotaPoolKey: 'groq::qwen/qwen3.8-27b',
    tpdLimit: 500_000
  },
  {
    providerId: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    displayName: 'Llama 3.3 70B Versatile',
    monthlyTokenBudget: 'free · 100K tokens/day',
    quotaPoolKey: 'groq::llama-3.3-70b-versatile',
    tpdLimit: 100_000
  },
  {
    providerId: 'groq',
    modelId: 'llama-3.1-8b-instant',
    displayName: 'Llama 3.1 8B Instant',
    monthlyTokenBudget: 'free · 500K tokens/day',
    quotaPoolKey: 'groq::llama-3.1-8b-instant',
    tpdLimit: 500_000
  },

  // Cerebras Cloud (1M tokens/day shared across models = ~30M/mo)
  {
    providerId: 'cerebras',
    modelId: 'llama3.3-70b',
    displayName: 'Cerebras Llama 3.3 70B',
    monthlyTokenBudget: 'free · 1M tokens/day',
    quotaPoolKey: 'cerebras::shared',
    tpdLimit: 1_000_000
  },
  {
    providerId: 'cerebras',
    modelId: 'llama3.1-8b',
    displayName: 'Cerebras Llama 3.1 8B',
    monthlyTokenBudget: 'free · 1M tokens/day',
    quotaPoolKey: 'cerebras::shared',
    tpdLimit: 1_000_000
  },

  // OpenRouter Free (~6M/mo across 200 RPD pool)
  {
    providerId: 'openrouter',
    modelId: 'openrouter/free',
    displayName: 'OpenRouter Free (Auto-Mesh)',
    monthlyTokenBudget: '~6M',
    quotaPoolKey: 'openrouter::free',
    tpdLimit: null
  },
  {
    providerId: 'openrouter',
    modelId: 'nvidia/nemotron-3.5-lightning:free',
    displayName: 'Nvidia Nemotron 3.5 Lightning (Free)',
    monthlyTokenBudget: '~6M',
    quotaPoolKey: 'openrouter::free',
    tpdLimit: null
  },
  {
    providerId: 'openrouter',
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    displayName: 'Nvidia Nemotron 3 Ultra 550B (Free)',
    monthlyTokenBudget: '~6M',
    quotaPoolKey: 'openrouter::free',
    tpdLimit: null
  },
  {
    providerId: 'openrouter',
    modelId: 'cohere/north-mini-code:free',
    displayName: 'Cohere North Mini Code (Free)',
    monthlyTokenBudget: '~6M',
    quotaPoolKey: 'openrouter::free',
    tpdLimit: null
  },
  {
    providerId: 'openrouter',
    modelId: 'google/gemma-4-31b-it:free',
    displayName: 'Google Gemma 4 31B (Free)',
    monthlyTokenBudget: '~6M',
    quotaPoolKey: 'openrouter::free',
    tpdLimit: null
  },
  {
    providerId: 'openrouter',
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    displayName: 'Meta Llama 3.3 70B (Free)',
    monthlyTokenBudget: '~6M',
    quotaPoolKey: 'openrouter::free',
    tpdLimit: null
  },

  // Mistral AI (Experiment free tier shared pool ~50-100M/mo)
  {
    providerId: 'mistral',
    modelId: 'codestral-latest',
    displayName: 'Codestral 2501 (Mistral)',
    monthlyTokenBudget: '~50-100M',
    quotaPoolKey: 'mistral::experiment-pool',
    tpdLimit: null
  },
  {
    providerId: 'mistral',
    modelId: 'mistral-small-latest',
    displayName: 'Mistral Small (Fast)',
    monthlyTokenBudget: '~50-100M',
    quotaPoolKey: 'mistral::experiment-pool',
    tpdLimit: null
  },

  // NVIDIA NIM (rate-limit-only free tier: 40 RPM)
  {
    providerId: 'nvidia',
    modelId: 'meta/llama-3.3-70b-instruct',
    displayName: 'NVIDIA Llama 3.3 70B Instruct',
    monthlyTokenBudget: 'free · 40 RPM',
    quotaPoolKey: 'nvidia::rate-limited',
    tpdLimit: null
  },
  {
    providerId: 'nvidia',
    modelId: 'deepseek-ai/deepseek-r1',
    displayName: 'NVIDIA DeepSeek R1',
    monthlyTokenBudget: 'free · 40 RPM',
    quotaPoolKey: 'nvidia::rate-limited',
    tpdLimit: null
  },

  // Cohere (~1-2M trial pool)
  {
    providerId: 'cohere',
    modelId: 'command-r-plus-08-2024',
    displayName: 'Cohere Command R+',
    monthlyTokenBudget: '~1-2M',
    quotaPoolKey: 'cohere::trial-pool',
    tpdLimit: null
  },
  {
    providerId: 'cohere',
    modelId: 'command-r-08-2024',
    displayName: 'Cohere Command R',
    monthlyTokenBudget: '~1-2M',
    quotaPoolKey: 'cohere::trial-pool',
    tpdLimit: null
  },

  // DeepSeek / SiliconFlow (~30M shared)
  {
    providerId: 'deepseek',
    modelId: 'deepseek-ai/DeepSeek-V3',
    displayName: 'DeepSeek V3 (Chat & Coding)',
    monthlyTokenBudget: '~30M',
    quotaPoolKey: 'deepseek::siliconflow',
    tpdLimit: null
  },
  {
    providerId: 'deepseek',
    modelId: 'deepseek-ai/DeepSeek-R1',
    displayName: 'DeepSeek R1 (Reasoning)',
    monthlyTokenBudget: '~30M',
    quotaPoolKey: 'deepseek::siliconflow',
    tpdLimit: null
  },

  // Cloudflare Workers AI (neurons quota -> unpublished token cap)
  {
    providerId: 'cloudflare',
    modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    displayName: 'Cloudflare Llama 3.3 70B Fast',
    monthlyTokenBudget: 'free · 10K neurons/day',
    quotaPoolKey: 'cloudflare::account',
    tpdLimit: null
  },
  {
    providerId: 'cloudflare',
    modelId: '@cf/qwen/qwen2.5-coder-32b-instruct',
    displayName: 'Cloudflare Qwen 2.5 Coder 32B',
    monthlyTokenBudget: 'free · 10K neurons/day',
    quotaPoolKey: 'cloudflare::account',
    tpdLimit: null
  },

  // Hugging Face Router (monthly credits -> credits-based)
  {
    providerId: 'huggingface',
    modelId: 'meta-llama/Llama-3.3-70B-Instruct',
    displayName: 'Hugging Face Llama 3.3 70B',
    monthlyTokenBudget: 'credits-based',
    quotaPoolKey: 'huggingface::router',
    tpdLimit: null
  },
  {
    providerId: 'huggingface',
    modelId: 'Qwen/Qwen3.8-27B',
    displayName: 'Hugging Face Qwen 3.8 27B',
    monthlyTokenBudget: 'credits-based',
    quotaPoolKey: 'huggingface::router',
    tpdLimit: null
  },
  {
    providerId: 'huggingface',
    modelId: 'deepseek-ai/DeepSeek-V4.1-Flash',
    displayName: 'Hugging Face DeepSeek V4.1 Flash',
    monthlyTokenBudget: 'credits-based',
    quotaPoolKey: 'huggingface::router',
    tpdLimit: null
  },

  // Keyless tiers
  {
    providerId: 'pollinations',
    modelId: 'openai',
    displayName: 'Pollinations GPT-OSS 20B (Keyless)',
    monthlyTokenBudget: 'free · rate-limited',
    quotaPoolKey: 'pollinations::account',
    tpdLimit: null
  },
  {
    providerId: 'kilo',
    modelId: 'kilo-auto/free',
    displayName: 'Kilo Auto Free',
    monthlyTokenBudget: 'free · 200/hr',
    quotaPoolKey: 'kilo::anonymous',
    tpdLimit: null
  },
  {
    providerId: 'kilo',
    modelId: 'nvidia/nemotron-3.5-super-vl:free',
    displayName: 'NVIDIA Nemotron 3.5 Super VL (Kilo)',
    monthlyTokenBudget: 'free · 200/hr',
    quotaPoolKey: 'kilo::anonymous',
    tpdLimit: null
  }
]

/**
 * Counts usable enabled credentials per provider (keyless providers stay active unless disabled).
 */
export function getUsableKeyCountsByProvider(): Map<ProviderId, number> {
  const counts = new Map<ProviderId, number>()
  try {
    const db = SqliteDatabase.getInstance()
    const secretStore = SecretStorageService.getInstance()
    const creds = secretStore.listCredentialMetadata()

    const disabledIds = new Set<string>()
    const metaRows = db
      .prepare('SELECT id, enabled FROM provider_metadata')
      .all() as Array<{ id: string; enabled: number }>

    for (const r of metaRows) {
      if (r.enabled === 0) disabledIds.add(r.id)
    }

    for (const cred of creds) {
      if (disabledIds.has(cred.id)) continue
      const p = cred.providerId as ProviderId
      counts.set(p, (counts.get(p) ?? 0) + 1)
    }

    for (const keyless of ['kilo', 'pollinations'] as ProviderId[]) {
      if (!counts.has(keyless)) {
        const explicitlyDisabled = metaRows.some(
          (r) => r.enabled === 0 && (r.id === `${keyless}-keyless` || r.id.startsWith(keyless))
        )
        if (!explicitlyDisabled) {
          counts.set(keyless, 1)
        }
      }
    }
  } catch {
    // Safe fallback if storage is unavailable
  }
  return counts
}
