/**
 * VersaRail AI Agent Harness - Workspace IPC Handlers
 * Wires native folder picker via Electron dialog.showOpenDialog,
 * active workspace retrieval, and controlled workspace file inspection.
 */

import { ipcMain, IpcMainInvokeEvent, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { WorkspaceService } from '../../workspace/workspace-service'

export function registerWorkspaceHandlers(): void {
  const workspaceService = WorkspaceService.getInstance()

  // 1. Native Folder Selection Dialog
  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_SELECT_FOLDER,
    async (
      event: IpcMainInvokeEvent,
      defaultPath?: string
    ): Promise<{ canceled: boolean; path?: string }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.WORKSPACE_SELECT_FOLDER)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const win =
        BrowserWindow.fromWebContents(event.sender) ||
        BrowserWindow.getFocusedWindow() ||
        undefined

      const result = await dialog.showOpenDialog(win as any, {
        title: 'Select Project Workspace',
        defaultPath: typeof defaultPath === 'string' ? defaultPath : undefined,
        properties: ['openDirectory', 'createDirectory']
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true }
      }

      const selectedPath = result.filePaths[0]
      workspaceService.setWorkspace(selectedPath)

      return {
        canceled: false,
        path: selectedPath
      }
    }
  )

  // 2. Get Current Active Workspace
  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_GET_CURRENT,
    async (event: IpcMainInvokeEvent): Promise<{ path: string | null; name: string | null }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.WORKSPACE_GET_CURRENT)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      return workspaceService.getCurrentWorkspace()
    }
  )

  // 3. Set Active Workspace Path Directly
  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_SET,
    async (
      event: IpcMainInvokeEvent,
      folderPath: string
    ): Promise<{ path: string | null; name: string | null }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.WORKSPACE_SET)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      return workspaceService.setWorkspace(folderPath)
    }
  )

  // 4. Inspect Workspace Files (Relative Subdirectory)
  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_INSPECT_FILES,
    async (
      event: IpcMainInvokeEvent,
      relativeDir?: string
    ): Promise<{ files: string[]; dirs: string[] }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.WORKSPACE_INSPECT_FILES)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      return workspaceService.inspectFiles(relativeDir || '.')
    }
  )
}

