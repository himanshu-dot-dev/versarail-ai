/**
 * VersaRail AI Agent Harness - Workspace Safe Filesystem Service
 * Manages active workspace state, canonical path validation, safe file reads,
 * bounded file search, and directory inspection without leaking sensitive files.
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  PathCanonicalizer,
  AccessDeniedError,
  ResolvePathOptions
} from './path-canonicalizer'
import { ExclusionFilter } from './exclusion-filter'

export interface WorkspaceState {
  path: string | null
  name: string | null
}

export interface ReadFileResult {
  content: string
  bytesRead: number
  isTruncated: boolean
  canonicalPath: string
}

export interface SearchFilesOptions {
  workspaceRoot?: string
  query?: string
  extension?: string
  maxResults?: number
  maxDepth?: number
  subDirectory?: string
}

export interface FileSearchResult {
  relativePath: string
  absolutePath: string
  size: number
}

export class WorkspaceService {
  private static instance: WorkspaceService | null = null
  private currentWorkspaceRoot: string | null = null

  private constructor() {}

  public static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService()
    }
    return WorkspaceService.instance
  }

  public static resetInstance(): void {
    WorkspaceService.instance = null
  }

  /**
   * Sets the active workspace folder, validating and canonicalizing it.
   */
  public setWorkspace(folderPath: string): WorkspaceState {
    const canonical = PathCanonicalizer.canonicalizeRoot(folderPath)
    this.currentWorkspaceRoot = canonical
    return this.getCurrentWorkspace()
  }

  /**
   * Clears the active workspace.
   */
  public clearWorkspace(): void {
    this.currentWorkspaceRoot = null
  }

  /**
   * Returns current active workspace path and project name.
   */
  public getCurrentWorkspace(): WorkspaceState {
    if (!this.currentWorkspaceRoot) {
      return { path: null, name: null }
    }
    return {
      path: this.currentWorkspaceRoot,
      name: path.basename(this.currentWorkspaceRoot)
    }
  }

  /**
   * Returns canonical root or null if unset.
   */
  public getWorkspaceRoot(): string | null {
    return this.currentWorkspaceRoot
  }

  /**
   * Resolves an untrusted path against the active or explicitly provided workspace root.
   */
  public resolveSafePath(
    untrustedPath: string,
    options: ResolvePathOptions & { workspaceRoot?: string } = {}
  ): string {
    const root = options.workspaceRoot || this.currentWorkspaceRoot
    if (!root) {
      throw new AccessDeniedError('No active workspace configured. Cannot resolve safe path.')
    }
    return PathCanonicalizer.resolveSafePath(root, untrustedPath, options)
  }

  /**
   * Inspects files and directories inside a relative subdirectory of the workspace.
   * Automatically filters out sensitive and excluded directories/files (.git, node_modules, .env).
   */
  public async inspectFiles(
    relativeDir: string = '.'
  ): Promise<{ files: string[]; dirs: string[] }> {
    if (!this.currentWorkspaceRoot) {
      return { files: [], dirs: [] }
    }

    const safeDir = this.resolveSafePath(relativeDir, { mustExist: true })
    const stat = await fs.promises.stat(safeDir)
    if (!stat.isDirectory()) {
      throw new Error(`Path "${relativeDir}" is not a directory`)
    }

    const dirents = await fs.promises.readdir(safeDir, { withFileTypes: true })
    const files: string[] = []
    const dirs: string[] = []

    for (const d of dirents) {
      const childRel = path.posix.join(
        relativeDir === '.' ? '' : relativeDir.replace(/\\/g, '/'),
        d.name
      )

      // Skip any sensitive files or excluded directories
      if (
        ExclusionFilter.isExcluded(d.name).excluded ||
        ExclusionFilter.isExcluded(childRel).excluded
      ) {
        continue
      }

      if (d.isDirectory()) {
        dirs.push(d.name)
      } else if (d.isFile() || d.isSymbolicLink()) {
        files.push(d.name)
      }
    }

    return {
      files: files.sort(),
      dirs: dirs.sort()
    }
  }

  /**
   * Safely reads file contents bounded by byte limits.
   */
  public async readFile(
    untrustedPath: string,
    options: { workspaceRoot?: string; maxBytes?: number } = {}
  ): Promise<ReadFileResult> {
    const safePath = this.resolveSafePath(untrustedPath, {
      workspaceRoot: options.workspaceRoot,
      mustExist: true
    })

    const stat = await fs.promises.stat(safePath)
    if (stat.isDirectory()) {
      throw new Error(`Cannot read directory as file: "${untrustedPath}"`)
    }

    const maxBytes = Math.min(Math.max(options.maxBytes ?? 500_000, 1), 5_000_000)
    const bytesToRead = Math.min(stat.size, maxBytes)

    const fileHandle = await fs.promises.open(safePath, 'r')
    try {
      const buffer = Buffer.alloc(bytesToRead)
      const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, 0)
      const content = buffer.toString('utf8', 0, bytesRead)

      return {
        content,
        bytesRead,
        isTruncated: stat.size > maxBytes,
        canonicalPath: safePath
      }
    } finally {
      await fileHandle.close()
    }
  }

  /**
   * Bounded workspace file search matching query and/or file extension.
   * Excludes sensitive directories (.git, node_modules, .env, .ssh) automatically.
   */
  public async searchFiles(options: SearchFilesOptions = {}): Promise<FileSearchResult[]> {
    const root = options.workspaceRoot || this.currentWorkspaceRoot
    if (!root) {
      throw new AccessDeniedError('No active workspace configured for file search.')
    }

    const canonicalRoot = PathCanonicalizer.canonicalizeRoot(root)
    const subDir = options.subDirectory && options.subDirectory !== '.' ? options.subDirectory : ''
    const startDir = subDir ? this.resolveSafePath(subDir, { workspaceRoot: canonicalRoot, mustExist: true }) : canonicalRoot

    const maxResults = Math.min(Math.max(options.maxResults ?? 100, 1), 500)
    const maxDepth = Math.min(Math.max(options.maxDepth ?? 8, 1), 15)
    const query = (options.query || '').trim().toLowerCase()
    const extension = options.extension
      ? (options.extension.startsWith('.') ? options.extension : `.${options.extension}`).toLowerCase()
      : null

    const results: FileSearchResult[] = []

    const traverse = async (currentDir: string, currentDepth: number): Promise<void> => {
      if (results.length >= maxResults || currentDepth > maxDepth) {
        return
      }

      let dirents: fs.Dirent[]
      try {
        dirents = await fs.promises.readdir(currentDir, { withFileTypes: true })
      } catch {
        return
      }

      for (const d of dirents) {
        if (results.length >= maxResults) break

        const fullPath = path.join(currentDir, d.name)
        const relFromRoot = path.relative(canonicalRoot, fullPath)

        // Check sensitive exclusion filter
        if (
          ExclusionFilter.isExcluded(d.name).excluded ||
          ExclusionFilter.isExcluded(relFromRoot).excluded
        ) {
          continue
        }

        if (d.isDirectory()) {
          await traverse(fullPath, currentDepth + 1)
        } else if (d.isFile() || d.isSymbolicLink()) {
          const lowerName = d.name.toLowerCase()

          // Filter by extension if specified
          if (extension && !lowerName.endsWith(extension)) {
            continue
          }

          // Filter by query if specified
          if (query && !lowerName.includes(query) && !relFromRoot.toLowerCase().includes(query)) {
            continue
          }

          let size = 0
          try {
            const stat = await fs.promises.stat(fullPath)
            size = stat.size
          } catch {
            // Ignore stat failures on broken links
          }

          results.push({
            relativePath: relFromRoot.replace(/\\/g, '/'),
            absolutePath: fullPath,
            size
          })
        }
      }
    }

    await traverse(startDir, 0)
    return results
  }
}

