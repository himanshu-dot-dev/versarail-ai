import { z } from 'zod'

export const PrivacySettingsSchema = z.object({
  allowedProviders: z.array(z.string()).default(['gemini', 'groq', 'cerebras', 'openrouter', 'custom']),
  allowPublicCloud: z.boolean().default(true),
  autoRedactSecrets: z.boolean().default(true),
  auditRetentionDays: z.number().nonnegative().default(30),
  contextWindowBudgetTokens: z.number().positive().default(32_000),
  autoSummarizeContext: z.boolean().default(true)
})

export type PrivacySettingsDTO = z.infer<typeof PrivacySettingsSchema>

export const GlobalSettingsSchema = z.object({
  privacy: PrivacySettingsSchema.default({}),
  defaultModel: z.string().default('gemini-2.5-flash'),
  temperature: z.number().min(0).max(2).default(0.7),
  theme: z.enum(['versarail-dark', 'light', 'system']).default('versarail-dark')
})

export type GlobalSettingsDTO = z.infer<typeof GlobalSettingsSchema>

