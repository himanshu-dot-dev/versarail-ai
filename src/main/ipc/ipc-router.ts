import { ipcMain, IpcMainInvokeEvent, IpcMainEvent, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from './sender-verifier'
import { SystemInfo } from '@shared/domain/models'
import { safeStorage } from 'electron'
import { registerProviderHandlers } from './handlers/provider-handlers'
import { registerChatHandlers } from './handlers/chat-handlers'
import { registerPermissionHandlers } from './handlers/permission-handlers'
import { registerWorkspaceHandlers } from './handlers/workspace-handlers'
import { registerDiffHandlers } from './handlers/diff-handlers'
import { registerTerminalHandlers } from './handlers/terminal-handlers'
import { registerSettingsHandlers } from './handlers/settings-handlers'

export function registerIpcHandlers(): void {
  // Register modular domain handlers
  registerProviderHandlers()
  registerChatHandlers()
  registerPermissionHandlers()
  registerWorkspaceHandlers()
  registerDiffHandlers()
  registerTerminalHandlers()
  registerSettingsHandlers()

  // Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event: IpcMainInvokeEvent): boolean => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win?.isMaximized() ?? false
  })

  // Baseline System Info Handler
  ipcMain.handle(IPC_CHANNELS.APP_GET_SYSTEM_INFO, async (event: IpcMainInvokeEvent): Promise<SystemInfo> => {
    if (!SenderVerifier.verify(event, IPC_CHANNELS.APP_GET_SYSTEM_INFO)) {
      throw new Error('Access denied: Unauthorized IPC sender')
    }

    let isSecureStorageAvailable = false
    let storageBackend = 'unavailable'

    try {
      isSecureStorageAvailable = safeStorage.isEncryptionAvailable()
      storageBackend = safeStorage.getSelectedStorageBackend()
    } catch {
      // safeStorage can throw if called before app ready or on unsupported environments
    }

    return {
      platform: process.platform as 'win32' | 'darwin' | 'linux',
      arch: process.arch,
      version: process.version,
      electronVersion: process.versions.electron || 'unknown',
      nodeVersion: process.versions.node,
      isSecureStorageAvailable,
      storageBackend
    }
  })

  // Baseline Ping Handler
  ipcMain.handle(IPC_CHANNELS.APP_PING, async (event: IpcMainInvokeEvent): Promise<string> => {
    if (!SenderVerifier.verify(event, IPC_CHANNELS.APP_PING)) {
      throw new Error('Access denied: Unauthorized IPC sender')
    }
    return 'pong'
  })
}
