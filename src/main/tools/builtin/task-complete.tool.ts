import { z } from 'zod'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'

export const TaskCompleteInputSchema = z.object({
  summary: z.string().min(1, 'Completion summary is required')
})

export type TaskCompleteInput = z.infer<typeof TaskCompleteInputSchema>

export const TaskCompleteOutputSchema = z.object({
  summary: z.string(),
  completed: z.boolean()
})

export type TaskCompleteOutput = z.infer<typeof TaskCompleteOutputSchema>

export class TaskCompleteTool implements ITool<TaskCompleteInput, TaskCompleteOutput> {
  public readonly name = 'task_complete'
  public readonly description =
    'Signals that the agent has completely resolved the user request, executed all necessary changes, and verified the result.'
  public readonly capability = 'fs:read' as const
  public readonly riskLevel = 'low' as const
  public readonly inputSchema = TaskCompleteInputSchema
  public readonly outputSchema = TaskCompleteOutputSchema

  public formatPermissionRequest(input: TaskCompleteInput): PermissionDetails {
    return {
      title: 'Task Complete',
      description: input.summary
    }
  }

  public async execute(input: TaskCompleteInput, _context: ToolExecutionContext): Promise<TaskCompleteOutput> {
    return {
      summary: input.summary,
      completed: true
    }
  }
}

