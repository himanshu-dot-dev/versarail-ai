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

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsDTO = {
  allowedProviders: DEFAULT_ALLOWED_PROVIDERS,
  allowPublicCloud: true,
  autoRedactSecrets: true,
  auditRetentionDays: 30,
  contextWindowBudgetTokens: 32_000,
  autoSummarizeContext: true
}

export const AgentPersonaEnum = z.enum([
  'expert',
  'concise',
  'security',
  'friendly',
  'custom'
])
export type AgentPersonaType = z.infer<typeof AgentPersonaEnum>

export const AgentAppearanceSettingsSchema = z.object({
  agentName: z.string().min(1).max(50).default('AI Agent'),
  userName: z.string().min(1).max(50).default('You'),
  agentAvatar: z.string().default('smart_toy'),
  agentPersona: AgentPersonaEnum.default('expert'),
  customPersonaPrompt: z.string().max(2000).default(''),
  theme: z.enum(['versarail-dark', 'light', 'system']).default('versarail-dark')
})

export type AgentAppearanceSettingsDTO = z.infer<typeof AgentAppearanceSettingsSchema>

export const DEFAULT_AGENT_APPEARANCE_SETTINGS: AgentAppearanceSettingsDTO = {
  agentName: 'AI Agent',
  userName: 'You',
  agentAvatar: 'smart_toy',
  agentPersona: 'expert',
  customPersonaPrompt: '',
  theme: 'versarail-dark'
}

export const GlobalSettingsSchema = z.object({
  privacy: PrivacySettingsSchema.default({}),
  appearance: AgentAppearanceSettingsSchema.default({}),
  defaultModel: z.string().default('gemini-3.5-flash'),
  temperature: z.number().min(0).max(2).default(0.7),
  theme: z.enum(['versarail-dark', 'light', 'system']).default('versarail-dark')
})

export type GlobalSettingsDTO = z.infer<typeof GlobalSettingsSchema>

