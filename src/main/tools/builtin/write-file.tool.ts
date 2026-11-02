import { z } from 'zod'
import * as fs from 'fs/promises'
import * as syncFs from 'fs'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'
import { WorkspaceService } from '../../workspace/workspace-service'

export const WriteFileInputSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  content: z.string().max(1_048_576, 'File write content exceeds 1MB safety buffer limit')
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
  public readonly description = 'Writes or overwrites text content to a destination file within the workspace.'
  public readonly capability = 'fs:write' as const
  public readonly riskLevel = 'high' as const
  public readonly inputSchema = WriteFileInputSchema
  public readonly outputSchema = WriteFileOutputSchema

  public formatPermissionRequest(input: WriteFileInput, context: ToolExecutionContext): PermissionDetails {
    const ws = WorkspaceService.getInstance()
    let resolvedPath: string

    try {
      resolvedPath = ws.resolveSafePath(input.path, {
        workspaceRoot: context.workspacePath || undefined,
        mustExist: false
      })
    } catch {
      resolvedPath = context.workspacePath
        ? path.resolve(context.workspacePath, input.path)
        : path.resolve(input.path)
    }

    const fileExists = syncFs.existsSync(resolvedPath)
    const byteLen = Buffer.byteLength(input.content, 'utf8')

    if (fileExists) {
      let existingPreview = ''
      try {
        const existingData = syncFs.readFileSync(resolvedPath, 'utf8')
        const existingLines = existingData.split('\n').slice(0, 8).map((l) => `- ${l}`).join('\n')
        existingPreview = existingLines
      } catch {
        existingPreview = '- [Could not read existing file content]'
      }

      const newLines = input.content.split('\n').slice(0, 8).map((l) => `+ ${l}`).join('\n')
      const diffPreview = `--- EXISTING ---\n${existingPreview}\n\n+++ PROPOSED NEW CONTENT +++\n${newLines}`

      return {
        title: '⚠️ Overwrite Existing File',
        description: `Overwrite existing file "${input.path}" (${byteLen} bytes new content)`,
        targetPath: resolvedPath,
        diffPreview
      }
    }

    const previewLines = input.content.split('\n').slice(0, 10).map((l) => `+ ${l}`).join('\n')
    const diffPreview =
      input.content.split('\n').length > 10
        ? `${previewLines}\n... (+${input.content.split('\n').length - 10} more lines)`
        : previewLines

    return {
      title: 'Create New File',
      description: `Create new file "${input.path}" (${byteLen} bytes)`,
      targetPath: resolvedPath,
      diffPreview
    }
  }

  public async execute(input: WriteFileInput, context: ToolExecutionContext): Promise<WriteFileOutput> {
    const ws = WorkspaceService.getInstance()
    const safePath = ws.resolveSafePath(input.path, {
      workspaceRoot: context.workspacePath || undefined,
      mustExist: false
    })

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(safePath), { recursive: true })

    const buffer = Buffer.from(input.content, 'utf8')
    await fs.writeFile(safePath, buffer)

    return {
      path: safePath,
      success: true,
      bytesWritten: buffer.byteLength
    }
  }
}
