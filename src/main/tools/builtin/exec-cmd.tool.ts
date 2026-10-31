import { z } from 'zod'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'
import { AgentCommandRunner } from '../../agent/command-runner'

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
    const cwd = input.cwd || context.workspacePath || process.cwd()
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
