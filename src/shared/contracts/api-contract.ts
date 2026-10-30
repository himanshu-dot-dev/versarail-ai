import {
  SystemInfo,
  ProviderMetadataDTO,
  ModelDescriptorDTO,
  PermissionRequestDTO,
  PermissionResponseDTO
} from '../domain/models'

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

  // Models
  listModels: (providerId?: string) => Promise<ModelDescriptorDTO[]>

  // Permissions
  respondPermission: (response: PermissionResponseDTO) => Promise<void>
  onPermissionRequest: (callback: (request: PermissionRequestDTO) => void) => () => void

  // Agent Streaming & Activity Events
  onStreamToken: (
    callback: (data: { runId: string; delta: string; isComplete: boolean }) => void
  ) => () => void
  onActivityEvent: (
    callback: (event: { runId: string; type: string; summary: string; timestamp: string }) => void
  ) => () => void

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

