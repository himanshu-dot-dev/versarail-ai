/**
 * VersaRail AI Agent Harness - Diff Engine
 * Generates unified diffs, structured hunks, additions/deletions counts,
 * and handles patch application using the pure-JS Myers diff algorithm.
 */

import { createHash } from 'crypto'
import * as jsdiff from 'diff'
import {
  DiffHunkDTO,
  DiffLineDTO,
  UnifiedDiffResultDTO
} from '@shared/schemas/diff.schema'

export class FileConflictError extends Error {
  public readonly isConflict = true
  constructor(message: string) {
    super(message)
    this.name = 'FileConflictError'
    Object.setPrototypeOf(this, FileConflictError.prototype)
  }
}

export class PatchApplicationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PatchApplicationError'
    Object.setPrototypeOf(this, PatchApplicationError.prototype)
  }
}

export class DiffEngine {
  /**
   * Computes a deterministic SHA-256 hash of a file's string or buffer content.
   */
  public static computeSha256(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Generates a unified diff comparing originalContent to newContent.
   */
  public static createUnifiedDiff(options: {
    filePath: string
    originalContent: string
    newContent: string
    contextLines?: number
  }): UnifiedDiffResultDTO {
    const { filePath, originalContent, newContent, contextLines = 3 } = options
    const baselineSha256 = this.computeSha256(originalContent)
    const newSha256 = this.computeSha256(newContent)

    if (originalContent === newContent) {
      return {
        filePath,
        patch: '',
        hunks: [],
        additions: 0,
        deletions: 0,
        baselineSha256,
        newSha256,
        hasChanges: false
      }
    }

    const patchText = jsdiff.createTwoFilesPatch(
      `a/${filePath}`,
      `b/${filePath}`,
      originalContent,
      newContent,
      'original',
      'proposed',
      { context: contextLines }
    )

    const rawPatch = jsdiff.structuredPatch(
      `a/${filePath}`,
      `b/${filePath}`,
      originalContent,
      newContent,
      'original',
      'proposed',
      { context: contextLines }
    )

    let additions = 0
    let deletions = 0

    const hunks: DiffHunkDTO[] = rawPatch.hunks.map((rawHunk) => {
      let curOldLine = rawHunk.oldStart
      let curNewLine = rawHunk.newStart
      const lines: DiffLineDTO[] = []

      for (const line of rawHunk.lines) {
        if (line.startsWith('+')) {
          additions++
          lines.push({
            type: 'add',
            content: line.slice(1),
            newLineNumber: curNewLine++
          })
        } else if (line.startsWith('-')) {
          deletions++
          lines.push({
            type: 'delete',
            content: line.slice(1),
            oldLineNumber: curOldLine++
          })
        } else {
          // Context line
          lines.push({
            type: 'context',
            content: line.startsWith(' ') ? line.slice(1) : line,
            oldLineNumber: curOldLine++,
            newLineNumber: curNewLine++
          })
        }
      }

      return {
        oldStart: rawHunk.oldStart,
        oldLines: rawHunk.oldLines,
        newStart: rawHunk.newStart,
        newLines: rawHunk.newLines,
        lines
      }
    })

    return {
      filePath,
      patch: patchText,
      hunks,
      additions,
      deletions,
      baselineSha256,
      newSha256,
      hasChanges: true
    }
  }

  /**
   * Applies a unified diff patch to the original text.
   * Throws PatchApplicationError if hunks do not match or cannot be cleanly applied.
   */
  public static applyPatch(originalContent: string, patchText: string): string {
    if (!patchText || patchText.trim().length === 0) {
      return originalContent
    }

    const result = jsdiff.applyPatch(originalContent, patchText)
    if (result === false) {
      throw new PatchApplicationError(
        'Failed to apply patch cleanly: hunks do not match target content'
      )
    }

    return result
  }
}

