export type ProviderId =
  | 'gemini'
  | 'groq'
  | 'cerebras'
  | 'openrouter'
  | 'custom'
  | 'nvidia'
  | 'mistral'
  | 'huggingface'
  | 'cohere'
  | 'deepseek'
  | 'cloudflare'
  | 'pollinations'
  | 'kilo'

export interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux'
  arch: string
  version: string
  electronVersion: string
  nodeVersion: string
  isSecureStorageAvailable: boolean
  storageBackend: string
}

export interface ProviderMetadataDTO {
  id: string
  providerId: ProviderId
  label: string
  customEndpoint?: string
  enabled: boolean
  isConfigured: boolean
  maskedKey: string
  healthStatus: 'healthy' | 'degraded' | 'cooldown' | 'unauthenticated' | 'quota_exhausted'
  lastValidatedAt?: string
}

export interface ModelDescriptorDTO {
  id: string
  providerId: ProviderId
  name: string
  contextWindow: number
  outputLimit: number
  supportsTools: boolean
  supportsStreaming: boolean
  isFreeTierAvailable: boolean
}

export type PermissionDecision = 'allow' | 'deny'
export type PermissionScope = 'once' | 'session' | 'always'

export interface PermissionRequestDTO {
  requestId: string
  capability: 'fs:read' | 'fs:write' | 'fs:delete' | 'cmd:exec' | 'net:search'
  title: string
  description: string
  targetPath?: string
  command?: string
  args?: string[]
  diffPreview?: string
  payloadHash: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface PermissionResponseDTO {
  requestId: string
  decision: PermissionDecision
  rememberScope?: PermissionScope
}

export interface ProviderTokenBreakdownDTO {
  providerId: ProviderId
  providerName: string
  poolKey: string
  usableKeyCount: number
  monthlyTokenBudgetTokens: number
  monthlyBudgetLabel: string
  budgetKind: 'documented' | 'credits' | 'unpublished'
  usedTokensMonth: number
  remainingTokensMonth: number
  inputTokens24h: number
  outputTokens24h: number
  inputTokensMonth: number
  outputTokensMonth: number
  modelsCount: number
}

export interface ModelBudgetEntryDTO {
  providerId: ProviderId
  modelId: string
  displayName: string
  budget: number
  used: number
  remaining: number
}

export interface TokenUsageSummaryDTO {
  generatedAt: string
  totalMonthlyBudgetTokens: number
  totalUsedMonthTokens: number
  totalRemainingMonthTokens: number
  remainingPct: number
  activeProviderCount: number
  providers: ProviderTokenBreakdownDTO[]
  models: ModelBudgetEntryDTO[]
  unpublishedCount: number
}

