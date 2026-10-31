import {
  SystemInfo,
  ProviderMetadataDTO,
  ModelDescriptorDTO,
  PermissionRequestDTO,
  PermissionResponseDTO
} from '../domain/models'

export interface FailoverEventDTO {
  runId?: string
  fromProvider: string
  toProvider: string
  fromModel: string
  toModel: string
  reason: string
  isSilent: boolean
  resetEta?: string | null
}

export interface ProviderHealthInfoDTO {
  providerId: string
  status: 'healthy' | 'degraded' | 'cooldown' | 'quota_exhausted'
  cooldownUntil: number | null
  cooldownEta?: string | null
  activeRequests: number
  lastError?: string
}

export interface IElectronApi {
  // System
  getSystemInfo: () => Promise<SystemInfo>
  ping: () => Promise<string>

  // Window Controls
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  isWindowMaximized: () => Promise<boolean>

  // Providers
  listProviders: () => Promise<ProviderMetadataDTO[]>
  saveCredential: (payload: {
    providerId: string
    label: string
    apiKey: string
    customEndpoint?: string
  }) => Promise<{ success: boolean; error?: string }>
  deleteCredential: (credentialId: string) => Promise<{ success: boolean }>
  validateCredential: (credentialId: string) => Promise<{ valid: boolean; error?: string }>
  testProviderConnection: (payload: {
    providerId: string
    apiKey?: string
    credentialId?: string
    customEndpoint?: string
  }) => Promise<{ success: boolean; latencyMs: number; modelsCount: number; error?: string }>
  getProviderHealthStatuses: () => Promise<Record<string, ProviderHealthInfoDTO>>

  // Models
  listModels: (providerId?: string) => Promise<ModelDescriptorDTO[]>

  // Permissions
  respondPermission: (response: PermissionResponseDTO) => Promise<void>
  onPermissionRequest: (callback: (request: PermissionRequestDTO) => void) => () => void

  // Conversations & Chat
  listConversations: () => Promise<Array<{ id: string; title: string; selectedModel: string; workspacePath?: string | null; createdAt: string; updatedAt: string }>>
  getConversation: (conversationId: string) => Promise<{ conversation: any; messages: any[] } | null>
  deleteConversation: (conversationId: string) => Promise<boolean>
  sendPrompt: (payload: {
    conversationId: string
    prompt: string
    modelId: string
    providerId: string
    workspacePath?: string | null
  }) => Promise<{ success: boolean; runId?: string; error?: string }>
  cancelRun: (runId: string) => Promise<{ success: boolean }>

  // Agent Streaming & Activity Events
  onStreamToken: (
    callback: (data: { runId: string; delta: string; isComplete: boolean; error?: string }) => void
  ) => () => void
  onActivityEvent: (
    callback: (event: { runId: string; type: string; summary: string; timestamp: string }) => void
  ) => () => void
  onFailoverEvent: (callback: (data: FailoverEventDTO) => void) => () => void

  // Workspace
  selectWorkspaceFolder: () => Promise<{ canceled: boolean; path?: string }>
  getCurrentWorkspace: () => Promise<{ path: string | null; name: string | null }>
  inspectWorkspaceFiles: (relativeDir?: string) => Promise<{ files: string[]; dirs: string[] }>

  // Terminal
  createTerminalSession: (options?: { shell?: string }) => Promise<{ sessionId: string }>
  writeTerminal: (sessionId: string, data: string) => void
  resizeTerminal: (sessionId: string, cols: number, rows: number) => void
  closeTerminal: (sessionId: string) => void
  onTerminalData: (
    callback: (event: { sessionId: string; data: string }) => void
  ) => () => void
}

declare global {
  interface Window {
    electronApi: IElectronApi
  }
}

