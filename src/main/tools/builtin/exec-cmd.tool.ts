import { z } from 'zod'
import { spawn } from 'child_process'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'
import { SecretRedactor } from '../../security/secret-redactor'

export const ExecCmdInputSchema = z.object({
  command: z.string().min(1, 'Executable command name is required'),
  args: z.array(z.string()).optional().default([]),
  cwd: z.string().optional(),
  timeoutMs: z.number().positive().optional().default(30_000)
})

export type ExecCmdInput = z.infer<typeof ExecCmdInputSchema>

export const ExecCmdOutputSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  executionDurationMs: z.number()
})

export type ExecCmdOutput = z.infer<typeof ExecCmdOutputSchema>

export class ExecCmdTool implements ITool<ExecCmdInput, ExecCmdOutput> {
  public readonly name = 'execute_command'
  public readonly description = 'Executes a system process or CLI command with structured arguments and strict output bounds.'
  public readonly capability = 'cmd:exec' as const
  public readonly riskLevel = 'critical' as const
  public readonly inputSchema = ExecCmdInputSchema
  public readonly outputSchema = ExecCmdOutputSchema

  public formatPermissionRequest(input: ExecCmdInput, context: ToolExecutionContext): PermissionDetails {
    const cwd = input.cwd || context.workspacePath || process.cwd()
    const fullCommand = [input.command, ...(input.args || [])].join(' ')

    return {
      title: 'Execute Command',
      description: `Run system command: "${fullCommand}"`,
      command: input.command,
      args: input.args,
      targetPath: path.resolve(cwd)
    }
  }

  public async execute(input: ExecCmdInput, context: ToolExecutionContext): Promise<ExecCmdOutput> {
    const startTime = Date.now()
    const cwd = input.cwd || context.workspacePath || process.cwd()
    const args = input.args || []
    const timeoutMs = input.timeoutMs || 30_000
    const maxOutputBytes = 1024 * 1024 // 1MB output cap

    return new Promise<ExecCmdOutput>((resolve, reject) => {
      // Use shell: true on Windows if running npm/npx/cmd, else shell: false
      const isWindows = process.platform === 'win32'
      const useShell = isWindows && (input.command.endsWith('.cmd') || input.command.endsWith('.bat'))

      const child = spawn(input.command, args, {
        cwd,
        shell: useShell,
        signal: context.signal,
        windowsHide: true
      })

      let stdoutAccumulator = ''
      let stderrAccumulator = ''
      let isTimedOut = false

      const timer = setTimeout(() => {
        isTimedOut = true
        child.kill('SIGTERM')
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL')
          }
        }, 2000)
      }, timeoutMs)

      child.stdout?.on('data', (data: Buffer) => {
        if (Buffer.byteLength(stdoutAccumulator, 'utf8') < maxOutputBytes) {
          stdoutAccumulator += data.toString('utf8')
        }
      })

      child.stderr?.on('data', (data: Buffer) => {
        if (Buffer.byteLength(stderrAccumulator, 'utf8') < maxOutputBytes) {
          stderrAccumulator += data.toString('utf8')
        }
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        reject(new Error(`Failed to spawn process "${input.command}": ${err.message}`))
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        const duration = Date.now() - startTime

        if (isTimedOut) {
          reject(new Error(`Command "${input.command}" timed out after ${timeoutMs}ms`))
          return
        }

        // Redact any leaked credentials from output
        const redactedStdout = SecretRedactor.redact(stdoutAccumulator)
        const redactedStderr = SecretRedactor.redact(stderrAccumulator)

        resolve({
          command: input.command,
          args,
          exitCode: code ?? -1,
          stdout: redactedStdout,
          stderr: redactedStderr,
          executionDurationMs: duration
        })
      })
    })
  }
}

