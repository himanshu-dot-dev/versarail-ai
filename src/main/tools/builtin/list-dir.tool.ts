import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'

export const ListDirInputSchema = z.object({
  path: z.string().optional().default('.'),
  recursive: z.boolean().optional().default(false)
})

export type ListDirInput = z.infer<typeof ListDirInputSchema>

export const DirectoryEntrySchema = z.object({
  name: z.string(),
  isDirectory: z.boolean(),
  size: z.number().optional()
})

export type DirectoryEntry = z.infer<typeof DirectoryEntrySchema>

export const ListDirOutputSchema = z.object({
  path: z.string(),
  entries: z.array(DirectoryEntrySchema)
})

export type ListDirOutput = z.infer<typeof ListDirOutputSchema>

export class ListDirTool implements ITool<ListDirInput, ListDirOutput> {
  public readonly name = 'list_directory'
  public readonly description = 'Lists files and folders inside a given directory.'
  public readonly capability = 'fs:read' as const
  public readonly riskLevel = 'low' as const
  public readonly inputSchema = ListDirInputSchema
  public readonly outputSchema = ListDirOutputSchema

  public formatPermissionRequest(input: ListDirInput, context: ToolExecutionContext): PermissionDetails {
    const target = input.path || '.'
    const resolvedPath = context.workspacePath
      ? path.resolve(context.workspacePath, target)
      : path.resolve(target)

    return {
      title: 'List Directory',
      description: `Inspect contents of directory "${target}"${input.recursive ? ' (recursive)' : ''}`,
      targetPath: resolvedPath
    }
  }

  public async execute(input: ListDirInput, context: ToolExecutionContext): Promise<ListDirOutput> {
    const target = input.path || '.'
    const resolvedPath = context.workspacePath
      ? path.resolve(context.workspacePath, target)
      : path.resolve(target)

    const dirents = await fs.readdir(resolvedPath, { withFileTypes: true })
    const entries: DirectoryEntry[] = []

    for (const d of dirents) {
      let size: number | undefined
      if (d.isFile()) {
        try {
          const stat = await fs.stat(path.join(resolvedPath, d.name))
          size = stat.size
        } catch {
          // Ignore stat failure
        }
      }
      entries.push({
        name: d.name,
        isDirectory: d.isDirectory(),
        size
      })
    }

    return {
      path: resolvedPath,
      entries
    }
  }
}

