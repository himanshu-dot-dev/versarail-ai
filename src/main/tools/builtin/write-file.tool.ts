import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'

export const WriteFileInputSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  content: z.string()
})

export type WriteFileInput = z.infer<typeof WriteFileInputSchema>

export const WriteFileOutputSchema = z.object({
  path: z.string(),
  success: z.boolean(),
  bytesWritten: z.number()
})

export type WriteFileOutput = z.infer<typeof WriteFileOutputSchema>

export class WriteFileTool implements ITool<WriteFileInput, WriteFileOutput> {
  public readonly name = 'write_file'
  public readonly description = 'Writes or overwrites text content to a destination file.'
  public readonly capability = 'fs:write' as const
  public readonly riskLevel = 'high' as const
  public readonly inputSchema = WriteFileInputSchema
  public readonly outputSchema = WriteFileOutputSchema

  public formatPermissionRequest(input: WriteFileInput, context: ToolExecutionContext): PermissionDetails {
    const resolvedPath = context.workspacePath
      ? path.resolve(context.workspacePath, input.path)
      : path.resolve(input.path)

    const byteLen = Buffer.byteLength(input.content, 'utf8')
    const previewLines = input.content.split('\n').slice(0, 10).map((l) => `+ ${l}`).join('\n')
    const diffPreview =
      input.content.split('\n').length > 10
        ? `${previewLines}\n... (+${input.content.split('\n').length - 10} more lines)`
        : previewLines

    return {
      title: 'Write File',
      description: `Write ${byteLen} bytes to "${input.path}"`,
      targetPath: resolvedPath,
      diffPreview
    }
  }

  public async execute(input: WriteFileInput, context: ToolExecutionContext): Promise<WriteFileOutput> {
    const resolvedPath = context.workspacePath
      ? path.resolve(context.workspacePath, input.path)
      : path.resolve(input.path)

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true })

    const buffer = Buffer.from(input.content, 'utf8')
    await fs.writeFile(resolvedPath, buffer)

    return {
      path: resolvedPath,
      success: true,
      bytesWritten: buffer.byteLength
    }
  }
}

