/**
 * VersaRail AI Agent Harness - Diff & Mutation Service
 * Coordinates diff generation, pre-application conflict detection,
 * atomic writing, and change journal logging.
 */

import * as fs from 'fs/promises'
import { DiffEngine, FileConflictError } from './diff-engine'
import { AtomicWriter } from './atomic-writer'
import { ChangeJournal } from './change-journal'
import { WorkspaceService } from '../workspace/workspace-service'
import {
  ReviewPatchRequestDTO,
  ApplyPatchRequestDTO,
  UnifiedDiffResultDTO,
  ApplyPatchResponseDTO
} from '@shared/schemas/diff.schema'

export class DiffService {
  private static instance: DiffService | null = null

  private constructor() {}

  public static getInstance(): DiffService {
    if (!DiffService.instance) {
      DiffService.instance = new DiffService()
    }
    return DiffService.instance
  }

  public static resetInstance(): void {
    DiffService.instance = null
  }

  /**
   * Reviews a proposed file patch, generating unified diff hunks,
   * calculating additions/deletions, and verifying against disk conflicts.
   */
  public async reviewPatch(request: ReviewPatchRequestDTO): Promise<UnifiedDiffResultDTO> {
    const ws = WorkspaceService.getInstance()
    const workspaceRoot = request.workspacePath || ws.getWorkspaceRoot() || undefined
    const safePath = ws.resolveSafePath(request.relativePath, {
      workspaceRoot,
      mustExist: false
    })

    let originalContent = ''
    let fileExists = false

    try {
      const stat = await fs.stat(safePath)
      if (stat.isFile()) {
        originalContent = await fs.readFile(safePath, 'utf8')
        fileExists = true
      }
    } catch {
      fileExists = false
      originalContent = ''
    }

    const currentDiskSha = fileExists ? DiffEngine.computeSha256(originalContent) : 'EMPTY_FILE'
    let hasConflict = false
    let conflictReason: string | undefined

    // Verify baseline hash if supplied by caller
    if (request.baselineSha256 && request.baselineSha256 !== currentDiskSha) {
      hasConflict = true
      conflictReason = `External modification detected: File hash on disk (${currentDiskSha.slice(0, 8)}) does not match baseline (${request.baselineSha256.slice(0, 8)})`
    }

    // Determine target proposed content
    let proposedContent = request.proposedContent || ''
    if (!request.proposedContent && request.patchText) {
      try {
        proposedContent = DiffEngine.applyPatch(originalContent, request.patchText)
      } catch (err: any) {
        proposedContent = originalContent
        hasConflict = true
        conflictReason = `Patch application failure: ${err.message}`
      }
    }

    const diffResult = DiffEngine.createUnifiedDiff({
      filePath: request.relativePath,
      originalContent,
      newContent: proposedContent
    })

    return {
      ...diffResult,
      hasConflict,
      conflictReason
    }
  }

  /**
   * Applies an approved patch to disk with strict conflict detection,
   * atomic writing, and change journal persistence.
   */
  public async applyPatch(request: ApplyPatchRequestDTO): Promise<ApplyPatchResponseDTO> {
    const ws = WorkspaceService.getInstance()
    const workspaceRoot = request.workspacePath || ws.getWorkspaceRoot() || undefined
    const safePath = ws.resolveSafePath(request.relativePath, {
      workspaceRoot,
      mustExist: false
    })

    let originalContent = ''
    let fileExists = false

    try {
      const stat = await fs.stat(safePath)
      if (stat.isFile()) {
        originalContent = await fs.readFile(safePath, 'utf8')
        fileExists = true
      }
    } catch {
      fileExists = false
      originalContent = ''
    }

    const currentDiskSha = fileExists ? DiffEngine.computeSha256(originalContent) : 'EMPTY_FILE'

    // 1. Mandatory Pre-Application Conflict Check
    if (request.baselineSha256 && request.baselineSha256 !== currentDiskSha) {
      throw new FileConflictError(
        `Pre-application conflict: Target file "${request.relativePath}" was modified externally since baseline read (expected ${request.baselineSha256.slice(0, 8)}, current ${currentDiskSha.slice(0, 8)}). Mutation aborted.`
      )
    }

    // 2. Resolve content to write
    let finalContent = request.proposedContent
    if (finalContent === undefined && request.patchText) {
      finalContent = DiffEngine.applyPatch(originalContent, request.patchText)
    }

    if (finalContent === undefined) {
      return {
        success: false,
        filePath: safePath,
        error: 'Neither proposedContent nor patchText was provided.'
      }
    }

    // 3. Perform crash-safe atomic write
    await AtomicWriter.writeAtomic(safePath, finalContent)
    const newSha256 = DiffEngine.computeSha256(finalContent)

    // 4. Record change in journal
    const patchText =
      request.patchText ||
      DiffEngine.createUnifiedDiff({
        filePath: request.relativePath,
        originalContent,
        newContent: finalContent
      }).patch

    const journal = ChangeJournal.getInstance()
    const journalId = journal.recordChange({
      runId: request.runId,
      workspacePath: workspaceRoot || '',
      relativePath: request.relativePath,
      baselineSha256: request.baselineSha256,
      diffPatch: patchText,
      status: 'applied'
    })

    return {
      success: true,
      filePath: safePath,
      journalId,
      newSha256
    }
  }
}

