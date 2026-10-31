/**
 * VersaRail AI Agent Harness - Diff & Patching IPC Handlers
 * Wires reviewable diff generation and atomic patch application over typed IPC.
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { DiffService } from '../../changes/diff-service'
import {
  ReviewPatchRequestSchema,
  ApplyPatchRequestSchema,
  UnifiedDiffResultDTO,
  ApplyPatchResponseDTO
} from '@shared/schemas/diff.schema'

export function registerDiffHandlers(): void {
  const diffService = DiffService.getInstance()

  // 1. Review Patch & Generate Unified Diff
  ipcMain.handle(
    IPC_CHANNELS.DIFF_REVIEW_PATCH,
    async (event: IpcMainInvokeEvent, payload: unknown): Promise<UnifiedDiffResultDTO> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.DIFF_REVIEW_PATCH)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const parsed = ReviewPatchRequestSchema.safeParse(payload)
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join(', ')
        throw new Error(`Invalid diff review request: ${issues}`)
      }

      return diffService.reviewPatch(parsed.data)
    }
  )

  // 2. Apply Patch with Conflict Check & Atomic Rename
  ipcMain.handle(
    IPC_CHANNELS.DIFF_APPLY_PATCH,
    async (event: IpcMainInvokeEvent, payload: unknown): Promise<ApplyPatchResponseDTO> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.DIFF_APPLY_PATCH)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const parsed = ApplyPatchRequestSchema.safeParse(payload)
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join(', ')
        return {
          success: false,
          filePath: '',
          error: `Invalid diff apply request: ${issues}`
        }
      }

      try {
        return await diffService.applyPatch(parsed.data)
      } catch (err: any) {
        return {
          success: false,
          filePath: parsed.data.relativePath,
          error: err.message,
          isConflict: !!err.isConflict
        }
      }
    }
  )
}

