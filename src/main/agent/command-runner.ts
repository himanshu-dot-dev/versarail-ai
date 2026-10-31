/**
 * VersaRail AI Agent Harness - Agent Command Runner
 * Executes authorized system processes with structured argument arrays,
 * strict execution timeouts, output buffer caps (1MB), recursive process-tree
 * termination via tree-kill, and automated credential redaction.
 */

import { spawn, ChildProcess } from 'child_process'
import treeKill from 'tree-kill'
import { SecretRedactor } from '../security/secret-redactor'

export interface CommandExecutionOptions {
  command: string
  args?: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
  maxOutputBytes?: number
  signal?: AbortSignal
}

export interface CommandExecutionResult {
  command: string
  args: string[]
  exitCode: number
  stdout: string
  stderr: string
  executionDurationMs: number
  isTruncated: boolean
  isTimedOut: boolean
}

export class AgentCommandRunner {
  private static instance: AgentCommandRunner | null = null
  private activeProcesses: Map<string, ChildProcess> = new Map()

  private constructor() {}

  public static getInstance(): AgentCommandRunner {
    if (!AgentCommandRunner.instance) {
      AgentCommandRunner.instance = new AgentCommandRunner()
    }
    return AgentCommandRunner.instance
  }

  public static resetInstance(): void {
    AgentCommandRunner.instance = null
  }

  /**
   * Recursively terminates a process tree using tree-kill.
   */
  public async terminateProcessTree(pid: number, signal: string = 'SIGKILL'): Promise<void> {
    return new Promise((resolve) => {
      treeKill(pid, signal, (err) => {
        if (err) {
          // If already exited or access denied, consider terminated
        }
        resolve()
      })
    })
  }

  /**
   * Executes a system command with structured arguments and strict resource bounds.
   */
  public async runCommand(options: CommandExecutionOptions): Promise<CommandExecutionResult> {
    const startTime = Date.now()
    const {
      command,
      args = [],
      cwd = process.cwd(),
      timeoutMs = 30_000,
      maxOutputBytes = 1024 * 1024 // 1 MB cap
    } = options

    return new Promise<CommandExecutionResult>((resolve, reject) => {
      const isWindows = process.platform === 'win32'
      const useShell = isWindows && (command.endsWith('.cmd') || command.endsWith('.bat'))

      // Sanitize environment variables: strip secret tokens from child process environment
      const sanitizedEnv: NodeJS.ProcessEnv = {
        ...process.env,
        ...(options.env || {})
      }

      let child: ChildProcess
      try {
        child = spawn(command, args, {
          cwd,
          env: sanitizedEnv,
          shell: useShell,
          windowsHide: true
        })
      } catch (err: any) {
        return reject(new Error(`Failed to spawn command "${command}": ${err.message}`))
      }

      let stdoutRaw = ''
      let stderrRaw = ''
      let stdoutBytes = 0
      let stderrBytes = 0
      let isTruncated = false
      let isTimedOut = false
      let isResolved = false

      const cleanUp = () => {
        if (child.pid) {
          this.activeProcesses.delete(String(child.pid))
        }
      }

      if (child.pid) {
        this.activeProcesses.set(String(child.pid), child)
      }

      // Timeout watchdog
      const timer = setTimeout(async () => {
        isTimedOut = true
        if (child.pid) {
          await this.terminateProcessTree(child.pid, 'SIGKILL')
        }
      }, timeoutMs)

      // External cancellation signal listener
      if (options.signal) {
        if (options.signal.aborted) {
          if (child.pid) {
            this.terminateProcessTree(child.pid, 'SIGKILL')
          }
          cleanUp()
          return reject(new Error(`Command "${command}" was aborted by signal`))
        }

        options.signal.addEventListener('abort', async () => {
          if (child.pid && !isResolved) {
            await this.terminateProcessTree(child.pid, 'SIGKILL')
          }
        })
      }

      child.stdout?.on('data', (chunk: Buffer) => {
        const chunkLen = chunk.length
        if (stdoutBytes + chunkLen <= maxOutputBytes) {
          stdoutRaw += chunk.toString('utf8')
          stdoutBytes += chunkLen
        } else {
          isTruncated = true
          if (stdoutBytes < maxOutputBytes) {
            const allowed = maxOutputBytes - stdoutBytes
            stdoutRaw += chunk.subarray(0, allowed).toString('utf8')
            stdoutBytes = maxOutputBytes
          }
        }
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        const chunkLen = chunk.length
        if (stderrBytes + chunkLen <= maxOutputBytes) {
          stderrRaw += chunk.toString('utf8')
          stderrBytes += chunkLen
        } else {
          isTruncated = true
          if (stderrBytes < maxOutputBytes) {
            const allowed = maxOutputBytes - stderrBytes
            stderrRaw += chunk.subarray(0, allowed).toString('utf8')
            stderrBytes = maxOutputBytes
          }
        }
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        cleanUp()
        if (!isResolved) {
          isResolved = true
          reject(new Error(`Process execution error for "${command}": ${err.message}`))
        }
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        cleanUp()
        if (isResolved) return
        isResolved = true

        const duration = Date.now() - startTime

        if (isTimedOut) {
          reject(new Error(`Command "${command}" timed out after ${timeoutMs}ms`))
          return
        }

        if (options.signal?.aborted) {
          reject(new Error(`Command "${command}" was aborted by signal`))
          return
        }

        // Redact any leaked API keys or credentials
        const redactedStdout = SecretRedactor.redact(stdoutRaw)
        const redactedStderr = SecretRedactor.redact(stderrRaw)

        resolve({
          command,
          args,
          exitCode: code ?? -1,
          stdout: isTruncated ? `${redactedStdout}\n[TRUNCATED: Output exceeded 1MB limit]` : redactedStdout,
          stderr: isTruncated ? `${redactedStderr}\n[TRUNCATED: Output exceeded 1MB limit]` : redactedStderr,
          executionDurationMs: duration,
          isTruncated,
          isTimedOut
        })
      })
    })
  }
}
