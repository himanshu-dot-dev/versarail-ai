import { z } from 'zod'
import { DEFAULT_ALLOWED_PROVIDERS } from './provider.schema'

export const PrivacySettingsSchema = z.object({
  allowedProviders: z.array(z.string()).default(DEFAULT_ALLOWED_PROVIDERS),
  allowPublicCloud: z.boolean().default(true),
  autoRedactSecrets: z.boolean().default(true),
  auditRetentionDays: z.number().nonnegative().default(30),
  contextWindowBudgetTokens: z.number().positive().default(32_000),
  autoSummarizeContext: z.boolean().default(true)
})

export type PrivacySettingsDTO = z.infer<typeof PrivacySettingsSchema>

export const GlobalSettingsSchema = z.object({
  privacy: PrivacySettingsSchema.default({}),
  defaultModel: z.string().default('gemini-3.5-flash'),
  temperature: z.number().min(0).max(2).default(0.7),
  theme: z.enum(['versarail-dark', 'light', 'system']).default('versarail-dark')
})

export type GlobalSettingsDTO = z.infer<typeof GlobalSettingsSchema>

