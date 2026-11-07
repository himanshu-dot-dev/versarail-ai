import { z } from 'zod'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'
import { WorkspaceService } from '../../workspace/workspace-service'

export const ReadFileInputSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  maxBytes: z.number().positive().max(5_000_000).optional().default(500_000)
})

export type ReadFileInput = z.infer<typeof ReadFileInputSchema>

export const ReadFileOutputSchema = z.object({
  path: z.string(),
  content: z.string(),
  bytesRead: z.number(),
  isTruncated: z.boolean()
})

export type ReadFileOutput = z.infer<typeof ReadFileOutputSchema>

export class ReadFileTool implements ITool<ReadFileInput, ReadFileOutput> {
  public readonly name = 'read_file'
  public readonly description = 'Reads text content from a file up to a specified maximum byte limit within the workspace.'
  public readonly capability = 'fs:read' as const
  public readonly riskLevel = 'low' as const
  public readonly inputSchema = ReadFileInputSchema
  public readonly outputSchema = ReadFileOutputSchema

  public formatPermissionRequest(input: ReadFileInput, context: ToolExecutionContext): PermissionDetails {
    const ws = WorkspaceService.getInstance()
    let targetPath: string

    try {
      targetPath = ws.resolveSafePath(input.path, {
        workspaceRoot: context.workspacePath || undefined,
        mustExist: false
      })
    } catch {
      // In case resolution throws on invalid paths, show the normalized attempted path
      targetPath = context.workspacePath
        ? path.resolve(context.workspacePath, input.path)
        : path.resolve(input.path)
    }

    return {
      title: 'Read File',
      description: `Read file contents from "${input.path}" (limit ${input.maxBytes || 500000} bytes)`,
      targetPath
    }
  }

  public async execute(input: ReadFileInput, context: ToolExecutionContext): Promise<ReadFileOutput> {
    const ws = WorkspaceService.getInstance()
    const result = await ws.readFile(input.path, {
      workspaceRoot: context.workspacePath || undefined,
      maxBytes: input.maxBytes
    })

    return {
      path: result.canonicalPath,
      content: result.content,
      bytesRead: result.bytesRead,
      isTruncated: result.isTruncated
    }
  }
}
