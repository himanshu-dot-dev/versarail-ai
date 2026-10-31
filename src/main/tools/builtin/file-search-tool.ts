/**
 * VersaRail AI Agent Harness - Bounded File Search Tool
 * Enables agents to safely find files across the workspace matching queries and extensions,
 * strictly bounded by result and depth limits, with sensitive paths (.env, .git, node_modules) excluded.
 */

import { z } from 'zod'
import * as path from 'path'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'
import { WorkspaceService } from '../../workspace/workspace-service'

export const FileSearchInputSchema = z.object({
  query: z.string().optional().default(''),
  extension: z.string().optional(),
  maxResults: z.number().positive().max(500).optional().default(100),
  subDirectory: z.string().optional().default('.')
})

export type FileSearchInput = z.infer<typeof FileSearchInputSchema>

export const FileSearchResultItemSchema = z.object({
  relativePath: z.string(),
  absolutePath: z.string(),
  size: z.number()
})

export type FileSearchResultItem = z.infer<typeof FileSearchResultItemSchema>

export const FileSearchOutputSchema = z.object({
  matches: z.array(FileSearchResultItemSchema),
  count: z.number(),
  isTruncated: z.boolean()
})

export type FileSearchOutput = z.infer<typeof FileSearchOutputSchema>

export class FileSearchTool implements ITool<FileSearchInput, FileSearchOutput> {
  public readonly name = 'file_search'
  public readonly description =
    'Searches for files inside the active workspace by filename pattern or extension, automatically excluding protected and sensitive directories (.env, .git, node_modules, .ssh).'
  public readonly capability = 'fs:read' as const
  public readonly riskLevel = 'low' as const
  public readonly inputSchema = FileSearchInputSchema
  public readonly outputSchema = FileSearchOutputSchema

  public formatPermissionRequest(
    input: FileSearchInput,
    context: ToolExecutionContext
  ): PermissionDetails {
    const ws = WorkspaceService.getInstance()
    let targetPath: string

    try {
      targetPath = ws.resolveSafePath(input.subDirectory || '.', {
        workspaceRoot: context.workspacePath || undefined,
        mustExist: false
      })
    } catch {
      targetPath = context.workspacePath
        ? path.resolve(context.workspacePath, input.subDirectory || '.')
        : path.resolve(input.subDirectory || '.')
    }

    const queryDesc = input.query ? `"${input.query}"` : '*'
    const extDesc = input.extension ? ` (ext: ${input.extension})` : ''

    return {
      title: 'Search Files',
      description: `Search workspace files matching query ${queryDesc}${extDesc} in "${input.subDirectory || '.'}"`,
      targetPath
    }
  }

  public async execute(
    input: FileSearchInput,
    context: ToolExecutionContext
  ): Promise<FileSearchOutput> {
    const ws = WorkspaceService.getInstance()
    const limit = input.maxResults || 100

    const results = await ws.searchFiles({
      workspaceRoot: context.workspacePath || undefined,
      query: input.query,
      extension: input.extension,
      maxResults: limit,
      subDirectory: input.subDirectory
    })

    return {
      matches: results,
      count: results.length,
      isTruncated: results.length >= limit
    }
  }
}

