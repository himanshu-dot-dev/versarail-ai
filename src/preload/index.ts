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
    providerId: string
    label: string
    apiKey: string
    customEndpoint?: string
  }): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_SAVE_CREDENTIAL, payload)
  },
  deleteCredential: (credentialId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_DELETE_CREDENTIAL, credentialId)
  },
  validateCredential: (credentialId: string): Promise<{ valid: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_VALIDATE_CREDENTIAL, credentialId)
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

  // Agent Streaming & Events
  onStreamToken: (
    callback: (data: { runId: string; delta: string; isComplete: boolean }) => void
  ): (() => void) => {
    const subscription = (
      _event: IpcRendererEvent,
      data: { runId: string; delta: string; isComplete: boolean }
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

  // Workspace
  selectWorkspaceFolder: (): Promise<{ canceled: boolean; path?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SELECT_FOLDER)
  },
  getCurrentWorkspace: (): Promise<{ path: string | null; name: string | null }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_CURRENT)
  },
  inspectWorkspaceFiles: (relativeDir?: string): Promise<{ files: string[]; dirs: string[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_INSPECT_FILES, relativeDir)
  },

  // Terminal
  createTerminalSession: (options?: { shell?: string }): Promise<{ sessionId: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE_SESSION, options)
  },
  writeTerminal: (sessionId: string, data: string): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_WRITE, { sessionId, data })
  },
  resizeTerminal: (sessionId: string, cols: number, rows: number): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, { sessionId, cols, rows })
  },
  closeTerminal: (sessionId: string): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_CLOSE, { sessionId })
  },
  onTerminalData: (
    callback: (event: { sessionId: string; data: string }) => void
  ): (() => void) => {
    const subscription = (
      _event: IpcRendererEvent,
      payload: { sessionId: string; data: string }
    ): void => {
      callback(payload)
    }
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, subscription)
    }
  }
}

// Strictly expose through contextBridge with contextIsolation enabled
contextBridge.exposeInMainWorld('electronApi', electronApi)

