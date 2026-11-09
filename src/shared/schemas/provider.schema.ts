import { z } from 'zod'
import { ProviderId } from '../domain/models'

export interface ProviderMetaInfo {
  id: ProviderId
  label: string
  category: 'cloud' | 'keyless' | 'aggregator'
  isKeyless?: boolean
}

export const ALL_SUPPORTED_PROVIDERS: ProviderMetaInfo[] = [
  { id: 'gemini', label: 'Google Gemini (Google AI Studio)', category: 'cloud' },
  { id: 'groq', label: 'GroqCloud (Ultra-Fast LPU)', category: 'cloud' },
  { id: 'cerebras', label: 'Cerebras Cloud (CS-3 Wafer)', category: 'cloud' },
  { id: 'nvidia', label: 'NVIDIA NIM (Microservices)', category: 'cloud' },
  { id: 'mistral', label: 'Mistral AI (Codestral / Large)', category: 'cloud' },
  { id: 'deepseek', label: 'SiliconFlow / DeepSeek', category: 'cloud' },
  { id: 'cloudflare', label: 'Cloudflare Workers AI', category: 'cloud' },
  { id: 'cohere', label: 'Cohere (Command R+)', category: 'cloud' },
  { id: 'pollinations', label: 'Pollinations.ai (Keyless Free Tier)', category: 'keyless', isKeyless: true },
  { id: 'kilo', label: 'Kilo Gateway (Keyless Free Tier)', category: 'keyless', isKeyless: true },
  { id: 'openrouter', label: 'OpenRouter Gateway', category: 'aggregator' },
  { id: 'huggingface', label: 'Hugging Face Router', category: 'aggregator' },
  { id: 'custom', label: 'Custom OpenAI-Compatible Endpoint', category: 'aggregator' }
]

export const DEFAULT_ALLOWED_PROVIDERS: ProviderId[] = ALL_SUPPORTED_PROVIDERS.map((p) => p.id)

export const SaveCredentialSchema = z
  .object({
    id: z.string().optional(),
    providerId: z.enum([
      'gemini',
      'groq',
      'cerebras',
      'openrouter',
      'custom',
      'nvidia',
      'mistral',
      'huggingface',
      'cohere',
      'deepseek',
      'cloudflare',
      'pollinations',
      'kilo'
    ]),
    label: z.string().min(1, 'Label is required').max(64, 'Label too long'),
    apiKey: z.string().max(512).optional(),
    customEndpoint: z
      .string()
      .url('Must be a valid URL')
      .optional()
      .or(z.literal(''))
      .refine((url) => {
        if (!url) return true
        try {
          const parsed = new URL(url)
          // Block cloud metadata services
          if (parsed.hostname === '169.254.169.254' || parsed.hostname === 'metadata.google.internal') {
            return false
          }
          return true
        } catch {
          return false
        }
      }, 'Access to cloud metadata endpoints is prohibited')
  })
  .refine(
    (data) =>
      Boolean(data.id) ||
      data.providerId === 'pollinations' ||
      data.providerId === 'kilo' ||
      (typeof data.apiKey === 'string' && data.apiKey.trim().length > 0),
    { message: 'API Key cannot be empty', path: ['apiKey'] }
  )

export type SaveCredentialInput = z.infer<typeof SaveCredentialSchema>

