import { z } from 'zod'

export const SaveCredentialSchema = z
  .object({
    id: z.string().optional(),
    providerId: z.enum(['gemini', 'groq', 'cerebras', 'openrouter', 'custom']),
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
    (data) => Boolean(data.id) || (typeof data.apiKey === 'string' && data.apiKey.trim().length > 0),
    { message: 'API Key cannot be empty', path: ['apiKey'] }
  )

export type SaveCredentialInput = z.infer<typeof SaveCredentialSchema>

