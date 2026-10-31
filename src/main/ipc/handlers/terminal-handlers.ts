/**
 * VersaRail AI Agent Harness - Terminal IPC Handlers
 * Connects renderer xterm.js interactive events to UserTerminalService.
 */

import { ipcMain, IpcMainInvokeEvent, IpcMainEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { UserTerminalService } from '../../terminal/terminal-service'

export function registerTerminalHandlers(): void {
  const terminalService = UserTerminalService.getInstance()

  // 1. Create Interactive Session
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_CREATE_SESSION,
    async (
      event: IpcMainInvokeEvent,
      options?: { shell?: string; cwd?: string }
    ): Promise<{ sessionId: string }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.TERMINAL_CREATE_SESSION)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      return terminalService.createSession({
        webContents: event.sender,
        shell: options?.shell,
        cwd: options?.cwd
      })
    }
  )

  // 2. User Keystroke Input
  ipcMain.on(
    IPC_CHANNELS.TERMINAL_WRITE,
    (event: IpcMainEvent, payload: { sessionId: string; data: string }): void => {
      if (!payload?.sessionId || typeof payload.data !== 'string') return
      terminalService.write(payload.sessionId, payload.data)
    }
  )

  // 3. Viewport Resize Geometry
  ipcMain.on(
    IPC_CHANNELS.TERMINAL_RESIZE,
    (event: IpcMainEvent, payload: { sessionId: string; cols: number; rows: number }): void => {
      if (!payload?.sessionId || typeof payload.cols !== 'number' || typeof payload.rows !== 'number') return
      terminalService.resize(payload.sessionId, payload.cols, payload.rows)
    }
  )

  // 4. Close Session
  ipcMain.on(
    IPC_CHANNELS.TERMINAL_CLOSE,
    (event: IpcMainEvent, payload: { sessionId: string }): void => {
      if (!payload?.sessionId) return
      terminalService.closeSession(payload.sessionId)
    }
  )
}

