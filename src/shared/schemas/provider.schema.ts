import { z } from 'zod'

export const SaveCredentialSchema = z.object({
  providerId: z.enum(['gemini', 'groq', 'cerebras', 'openrouter', 'custom']),
  label: z.string().min(1, 'Label is required').max(64, 'Label too long'),
  apiKey: z.string().min(1, 'API Key cannot be empty').max(512),
  customEndpoint: z
    .string()
    .url('Must be a valid URL')
    .optional()
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

export type SaveCredentialInput = z.infer<typeof SaveCredentialSchema>

