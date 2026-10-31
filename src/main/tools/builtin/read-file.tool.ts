import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'

export const ReadFileInputSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  maxBytes: z.number().positive().optional().default(500_000)
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
  public readonly description = 'Reads text content from a file up to a specified maximum byte limit.'
  public readonly capability = 'fs:read' as const
  public readonly riskLevel = 'low' as const
  public readonly inputSchema = ReadFileInputSchema
  public readonly outputSchema = ReadFileOutputSchema

  public formatPermissionRequest(input: ReadFileInput, context: ToolExecutionContext): PermissionDetails {
    const resolvedPath = context.workspacePath
      ? path.resolve(context.workspacePath, input.path)
      : path.resolve(input.path)

    return {
      title: 'Read File',
      description: `Read file contents from "${input.path}" (limit ${input.maxBytes || 500000} bytes)`,
      targetPath: resolvedPath
    }
  }

  public async execute(input: ReadFileInput, context: ToolExecutionContext): Promise<ReadFileOutput> {
    const resolvedPath = context.workspacePath
      ? path.resolve(context.workspacePath, input.path)
      : path.resolve(input.path)

    const fileHandle = await fs.open(resolvedPath, 'r')
    try {
      const stat = await fileHandle.stat()
      const maxBytes = input.maxBytes || 500_000
      const bytesToRead = Math.min(stat.size, maxBytes)
      const buffer = Buffer.alloc(bytesToRead)

      const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, 0)
      const content = buffer.toString('utf8', 0, bytesRead)

      return {
        path: resolvedPath,
        content,
        bytesRead,
        isTruncated: stat.size > maxBytes
      }
    } finally {
      await fileHandle.close()
    }
  }
}

