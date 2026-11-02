import { z } from 'zod'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'
import { AgentCommandRunner } from '../../agent/command-runner'
import { WorkspaceService } from '../../workspace/workspace-service'
import { CommandPolicy } from '../../security/command-policy'

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
  executionDurationMs: z.number(),
  isTruncated: z.boolean().optional(),
  isTimedOut: z.boolean().optional()
})

export type ExecCmdOutput = z.infer<typeof ExecCmdOutputSchema>

export class ExecCmdTool implements ITool<ExecCmdInput, ExecCmdOutput> {
  public readonly name = 'execute_command'
  public readonly description = 'Executes a system process or CLI command with structured arguments and strict output bounds.'
  public readonly capability = 'cmd:exec' as const
  public readonly riskLevel = 'critical' as const
  public readonly inputSchema = ExecCmdInputSchema
  public readonly outputSchema = ExecCmdOutputSchema

  private resolveWorkingDir(inputCwd?: string, contextWorkspace?: string): string {
    const ws = WorkspaceService.getInstance()
    if (inputCwd) {
      return ws.resolveSafePath(inputCwd, {
        workspaceRoot: contextWorkspace || undefined,
        mustExist: true
      })
    }
    return contextWorkspace || ws.getWorkspaceRoot() || process.cwd()
  }

  public formatPermissionRequest(input: ExecCmdInput, context: ToolExecutionContext): PermissionDetails {
    let resolvedCwd: string
    try {
      resolvedCwd = this.resolveWorkingDir(input.cwd, context.workspacePath)
    } catch {
      resolvedCwd = context.workspacePath
        ? path.resolve(context.workspacePath, input.cwd || '.')
        : path.resolve(input.cwd || '.')
    }

    const policy = CommandPolicy.validate(input.command, input.args)
    const fullCommand = [input.command, ...(input.args || [])].join(' ')

    return {
      title: policy.verdict === 'escalated' ? `⚠️ Execute Command (${policy.reason})` : 'Execute Command',
      description: `Run system command: "${fullCommand}"`,
      command: input.command,
      args: input.args,
      targetPath: path.resolve(resolvedCwd)
    }
  }

  public async execute(input: ExecCmdInput, context: ToolExecutionContext): Promise<ExecCmdOutput> {
    // 1. Validate command security policy
    const policy = CommandPolicy.validate(input.command, input.args)
    if (policy.verdict === 'blocked') {
      throw new Error(`[Security Alert] Execution blocked by Command Policy: ${policy.reason}`)
    }

    // 2. Resolve and sandbox CWD
    const cwd = this.resolveWorkingDir(input.cwd, context.workspacePath)
    const runner = AgentCommandRunner.getInstance()

    const result = await runner.runCommand({
      command: input.command,
      args: input.args,
      cwd,
      timeoutMs: input.timeoutMs,
      signal: context.signal
    })

    return {
      command: result.command,
      args: result.args,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      executionDurationMs: result.executionDurationMs,
      isTruncated: result.isTruncated,
      isTimedOut: result.isTimedOut
    }
  }
}
