import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { IElectronApi } from '@shared/contracts/api-contract'
import {
  SystemInfo,
  ProviderMetadataDTO,
  ModelDescriptorDTO,
  PermissionRequestDTO,
  PermissionResponseDTO
} from '@shared/domain/models'

const electronApi: IElectronApi = {
  // System
  getSystemInfo: (): Promise<SystemInfo> => {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SYSTEM_INFO)
  },
  ping: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_PING)
  },

  // Window Controls
  minimizeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE)
  },
  maximizeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE)
  },
  closeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE)
  },
  isWindowMaximized: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED)
  },

  // Providers
  listProviders: (): Promise<ProviderMetadataDTO[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_LIST)
  },
  saveCredential: (payload: {
    id?: string
    providerId: string
    label: string
    apiKey?: string
    customEndpoint?: string
  }): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_SAVE_CREDENTIAL, payload)
  },
  deleteCredential: (credentialId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_DELETE_CREDENTIAL, credentialId)
  },
  setProviderEnabled: (credentialId: string, enabled: boolean): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_SET_ENABLED, { credentialId, enabled })
  },
  validateCredential: (credentialId: string): Promise<{ valid: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_VALIDATE_CREDENTIAL, credentialId)
  },
  testProviderConnection: (payload: {
    providerId: string
    apiKey?: string
    credentialId?: string
    customEndpoint?: string
  }): Promise<{ success: boolean; latencyMs: number; modelsCount: number; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_TEST_CONNECTION, payload)
  },
  getProviderHealthStatuses: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_GET_HEALTH_STATUSES)
  },

  // Models
  listModels: (providerId?: string): Promise<ModelDescriptorDTO[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MODELS_LIST_AVAILABLE, providerId)
  },

  // Permissions
  respondPermission: (response: PermissionResponseDTO): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_RESPOND, response)
  },
  onPermissionRequest: (callback: (request: PermissionRequestDTO) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, request: PermissionRequestDTO): void => {
      callback(request)
    }
    ipcRenderer.on(IPC_CHANNELS.PERMISSION_REQUEST, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.PERMISSION_REQUEST, subscription)
    }
  },

  // Conversations & Chat
  listConversations: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_LIST)
  },
  getConversation: (conversationId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_GET, conversationId)
  },
  deleteConversation: (conversationId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_DELETE, conversationId)
  },
  renameConversation: (conversationId: string, title: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_RENAME, { conversationId, title })
  },
  sendPrompt: (payload: {
    conversationId: string
    prompt: string
    modelId: string
    providerId: string
    workspacePath?: string | null
  }) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AGENT_SEND_PROMPT, payload)
  },
  cancelRun: (runId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AGENT_CANCEL_RUN, runId)
  },

  // Agent Streaming & Events
  onStreamToken: (
    callback: (data: {
      runId: string
      conversationId?: string
      modelId?: string
      delta: string
      isComplete: boolean
      error?: string
    }) => void
  ): (() => void) => {
    const subscription = (
      _event: IpcRendererEvent,
      data: {
        runId: string
        conversationId?: string
        modelId?: string
        delta: string
        isComplete: boolean
        error?: string
      }
    ): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.AGENT_STREAM_TOKEN, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STREAM_TOKEN, subscription)
    }
  },
  onActivityEvent: (
    callback: (event: { runId: string; type: string; summary: string; timestamp: string }) => void
  ): (() => void) => {
    const subscription = (
      _event: IpcRendererEvent,
      event: { runId: string; type: string; summary: string; timestamp: string }
    ): void => {
      callback(event)
    }
    ipcRenderer.on(IPC_CHANNELS.AGENT_ACTIVITY_EVENT, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_ACTIVITY_EVENT, subscription)
    }
  },
  onFailoverEvent: (
    callback: (data: any) => void
  ): (() => void) => {
    const subscription = (_event: IpcRendererEvent, data: any): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.AGENT_FAILOVER, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_FAILOVER, subscription)
    }
  },

  // Workspace
  selectWorkspaceFolder: (): Promise<{ canceled: boolean; path?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SELECT_FOLDER)
  },
  selectFile: (defaultPath?: string): Promise<{ canceled: boolean; filePaths?: string[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SELECT_FILE, defaultPath)
  },
  getCurrentWorkspace: (): Promise<{ path: string | null; name: string | null }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_CURRENT)
  },
  setWorkspace: (folderPath: string): Promise<{ path: string | null; name: string | null }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SET, folderPath)
  },
  inspectWorkspaceFiles: (relativeDir?: string): Promise<{ files: string[]; dirs: string[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_INSPECT_FILES, relativeDir)
  },

  // Diff & Patching
  reviewPatch: (request: any) => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIFF_REVIEW_PATCH, request)
  },
  applyPatch: (request: any) => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIFF_APPLY_PATCH, request)
  },

  // Settings & Privacy
  getSettings: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET)
  },
  saveSettings: (settings: any) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings)
  },
  purgeData: (retentionDays?: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_PURGE_DATA, retentionDays)
  },

  // Per-Provider Token Calculator
  getTokenUsageSummary: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_TOKEN_BUDGET)
  }
}

// Strictly expose through contextBridge with contextIsolation enabled
contextBridge.exposeInMainWorld('electronApi', electronApi)

