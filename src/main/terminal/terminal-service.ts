/**
 * VersaRail AI Agent Harness - User Interactive Terminal Service
 * Manages developer interactive shell instances (PowerShell, bash, zsh)
 * with bi-directional streaming over typed IPC, and process-tree termination.
 *
 * ADR-004: This service is strictly dedicated to developer keystrokes and
 * NEVER accepts programmatic command injection from the AI model.
 */

import { spawn, ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import treeKill from 'tree-kill'
import { WebContents } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { WorkspaceService } from '../workspace/workspace-service'

export interface TerminalSessionOptions {
  webContents?: WebContents
  shell?: string
  cwd?: string
  env?: NodeJS.ProcessEnv
  onData?: (data: string) => void
  onExit?: (code: number) => void
}

export interface TerminalSession {
  id: string
  shell: string
  cwd: string
  child: ChildProcess
  cols: number
  rows: number
  createdAt: number
}

export class UserTerminalService {
  private static instance: UserTerminalService | null = null
  private sessions: Map<string, TerminalSession> = new Map()

  private constructor() {}

  public static getInstance(): UserTerminalService {
    if (!UserTerminalService.instance) {
      UserTerminalService.instance = new UserTerminalService()
    }
    return UserTerminalService.instance
  }

  public static resetInstance(): void {
    if (UserTerminalService.instance) {
      UserTerminalService.instance.closeAllSessions()
      UserTerminalService.instance = null
    }
  }

  /**
   * Determines the default interactive shell executable for the current OS.
   */
  public getDefaultShell(): { shell: string; args: string[] } {
    if (process.platform === 'win32') {
      const powershell = process.env.SystemRoot
        ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
        : 'powershell.exe'
      return { shell: powershell, args: ['-NoLogo'] }
    }

    const unixShell = process.env.SHELL || '/bin/bash'
    return { shell: unixShell, args: ['-l'] }
  }

  /**
   * Spawns a new interactive user terminal session.
   */
  public createSession(options: TerminalSessionOptions = {}): { sessionId: string } {
    const sessionId = randomUUID()
    const { shell, args } = this.getDefaultShell()
    const targetShell = options.shell || shell
    const defaultCwd =
      options.cwd || WorkspaceService.getInstance().getWorkspaceRoot() || process.cwd()

    const child = spawn(targetShell, options.shell ? [] : args, {
      cwd: defaultCwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        ...(options.env || {})
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    })

    const session: TerminalSession = {
      id: sessionId,
      shell: targetShell,
      cwd: defaultCwd,
      child,
      cols: 80,
      rows: 24,
      createdAt: Date.now()
    }

    this.sessions.set(sessionId, session)

    // Stream child process stdout to renderer
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf8')
      options.onData?.(text)
      if (options.webContents && !options.webContents.isDestroyed()) {
        options.webContents.send(IPC_CHANNELS.TERMINAL_DATA, {
          sessionId,
          data: text
        })
      }
    })

    // Stream child process stderr to renderer
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf8')
      options.onData?.(text)
      if (options.webContents && !options.webContents.isDestroyed()) {
        options.webContents.send(IPC_CHANNELS.TERMINAL_DATA, {
          sessionId,
          data: text
        })
      }
    })

    child.on('close', (code) => {
      options.onExit?.(code ?? 0)
      if (options.webContents && !options.webContents.isDestroyed()) {
        options.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, {
          sessionId,
          code: code ?? 0
        })
      }
      this.sessions.delete(sessionId)
    })

    return { sessionId }
  }

  /**
   * Writes developer keystrokes directly to the session stdin.
   */
  public write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || !session.child.stdin || !session.child.stdin.writable) {
      return false
    }

    session.child.stdin.write(data)
    return true
  }

  /**
   * Updates recorded terminal viewport geometry.
   */
  public resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    session.cols = cols
    session.rows = rows
    return true
  }

  /**
   * Closes a terminal session and terminates its process tree.
   */
  public closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    if (session.child.pid) {
      treeKill(session.child.pid, 'SIGKILL', () => {})
    }

    this.sessions.delete(sessionId)
    return true
  }

  /**
   * Closes all active sessions.
   */
  public closeAllSessions(): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.child.pid) {
        treeKill(session.child.pid, 'SIGKILL', () => {})
      }
      this.sessions.delete(id)
    }
  }

  /**
   * Retrieves an active session by ID.
   */
  public getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Returns the count of active interactive sessions.
   */
  public getActiveSessionCount(): number {
    return this.sessions.size
  }
}

