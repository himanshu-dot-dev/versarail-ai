import { z } from 'zod'
import * as fs from 'fs/promises'
import * as syncFs from 'fs'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'
import { WorkspaceService } from '../../workspace/workspace-service'

export const EditFileInputSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  targetContent: z.string().min(1, 'Target content block to replace is required'),
  replacementContent: z.string().describe('New content to replace targetContent with')
})

export type EditFileInput = z.infer<typeof EditFileInputSchema>

export const EditFileOutputSchema = z.object({
  path: z.string(),
  success: z.boolean(),
  bytesWritten: z.number(),
  replacements: z.number()
})

export type EditFileOutput = z.infer<typeof EditFileOutputSchema>

export class EditFileTool implements ITool<EditFileInput, EditFileOutput> {
  public readonly name = 'edit_file'
  public readonly description =
    'Surgically replaces a specific contiguous block of text (targetContent) with new content (replacementContent) in a workspace file.'
  public readonly capability = 'fs:write' as const
  public readonly riskLevel = 'medium' as const
  public readonly inputSchema = EditFileInputSchema
  public readonly outputSchema = EditFileOutputSchema

  public formatPermissionRequest(input: EditFileInput, context: ToolExecutionContext): PermissionDetails {
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

    const removedLines = input.targetContent
      .split('\n')
      .slice(0, 8)
      .map((l) => `- ${l}`)
      .join('\n')
    const addedLines = input.replacementContent
      .split('\n')
      .slice(0, 8)
      .map((l) => `+ ${l}`)
      .join('\n')

    const diffPreview = `--- TARGET (TO REMOVE) ---\n${removedLines}\n\n+++ REPLACEMENT (TO INSERT) +++\n${addedLines}`

    return {
      title: 'Surgical Edit File',
      description: `Edit block in "${input.path}"`,
      targetPath: resolvedPath,
      diffPreview
    }
  }

  public async execute(input: EditFileInput, context: ToolExecutionContext): Promise<EditFileOutput> {
    const ws = WorkspaceService.getInstance()
    const safePath = ws.resolveSafePath(input.path, {
      workspaceRoot: context.workspacePath || undefined,
      mustExist: true
    })

    const rawFileContent = await fs.readFile(safePath, 'utf8')

    // 1. Try exact match
    let updatedContent: string | null = null
    if (rawFileContent.includes(input.targetContent)) {
      updatedContent = rawFileContent.replace(input.targetContent, input.replacementContent)
    } else {
      // 2. Try normalized line endings (CRLF -> LF)
      const normalizedFile = rawFileContent.replace(/\r\n/g, '\n')
      const normalizedTarget = input.targetContent.replace(/\r\n/g, '\n')
      const normalizedReplacement = input.replacementContent.replace(/\r\n/g, '\n')

      if (normalizedFile.includes(normalizedTarget)) {
        updatedContent = normalizedFile.replace(normalizedTarget, normalizedReplacement)
      }
    }

    if (updatedContent === null) {
      throw new Error(
        `Target content block was not found in "${input.path}". Please ensure exact matching including whitespace and indentation, or read the file again to verify.`
      )
    }

    const buffer = Buffer.from(updatedContent, 'utf8')
    await fs.writeFile(safePath, buffer)

    return {
      path: safePath,
      success: true,
      bytesWritten: buffer.byteLength,
      replacements: 1
    }
  }
}

