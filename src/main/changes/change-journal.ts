/**
 * VersaRail AI Agent Harness - File Change Journal
 * Persists file mutation history to SQLite, tracks baseline SHA-256 hashes,
 * unified diff patches, and powers rollback auditing.
 */

import { randomUUID } from 'crypto'
import { SqliteDatabase } from '../storage/sqlite-database'
import { FileChangeJournalEntryDTO } from '@shared/schemas/diff.schema'
import { WorkspaceService } from '../workspace/workspace-service'
import { AtomicWriter } from './atomic-writer'
import * as jsdiff from 'diff'

export class ChangeJournal {
  private static instance: ChangeJournal | null = null
  private db: SqliteDatabase

  private constructor() {
    this.db = SqliteDatabase.getInstance()
  }

  public static getInstance(): ChangeJournal {
    if (!ChangeJournal.instance) {
      ChangeJournal.instance = new ChangeJournal()
    }
    return ChangeJournal.instance
  }

  public static resetInstance(): void {
    ChangeJournal.instance = null
  }

  /**
   * Records a new file mutation in the SQLite change journal.
   */
  public recordChange(entry: {
    runId?: string | null
    workspacePath: string
    relativePath: string
    baselineSha256: string
    diffPatch: string
    status?: 'applied' | 'reverted' | 'failed'
  }): string {
    const id = randomUUID()
    const now = new Date().toISOString()
    const status = entry.status || 'applied'

    const stmt = this.db.prepare(`
      INSERT INTO file_changes_journal (
        id, run_id, workspace_path, relative_path, baseline_sha256, diff_patch, status, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      entry.runId || null,
      entry.workspacePath,
      entry.relativePath,
      entry.baselineSha256,
      entry.diffPatch,
      status,
      now
    )

    return id
  }

  /**
   * Retrieves a change journal record by ID.
   */
  public getChange(id: string): FileChangeJournalEntryDTO | null {
    const stmt = this.db.prepare(`
      SELECT id, run_id as runId, workspace_path as workspacePath,
             relative_path as relativePath, baseline_sha256 as baselineSha256,
             diff_patch as diffPatch, status, applied_at as appliedAt
      FROM file_changes_journal
      WHERE id = ?
    `)

    const row = stmt.get(id) as any
    return row || null
  }

  /**
   * Lists recent file mutations for a given workspace.
   */
  public listChanges(workspacePath: string, limit = 50): FileChangeJournalEntryDTO[] {
    const stmt = this.db.prepare(`
      SELECT id, run_id as runId, workspace_path as workspacePath,
             relative_path as relativePath, baseline_sha256 as baselineSha256,
             diff_patch as diffPatch, status, applied_at as appliedAt
      FROM file_changes_journal
      WHERE workspace_path = ?
      ORDER BY applied_at DESC
      LIMIT ?
    `)

    const rows = stmt.all(workspacePath, limit) as any[]
    return rows
  }

  /**
   * Updates the status of an existing change entry.
   */
  public updateStatus(id: string, status: 'applied' | 'reverted' | 'failed'): boolean {
    const stmt = this.db.prepare(`
      UPDATE file_changes_journal
      SET status = ?
      WHERE id = ?
    `)
    const result = stmt.run(status, id)
    return (result as any).changes > 0
  }

  /**
   * Reverts a recorded patch from the journal back to the prior content state.
   */
  public async revertChange(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    const change = this.getChange(id)
    if (!change) {
      return { success: false, error: `Change journal entry "${id}" not found` }
    }

    if (change.status === 'reverted') {
      return { success: false, error: 'Change has already been reverted' }
    }

    const ws = WorkspaceService.getInstance()
    let safePath: string
    try {
      safePath = ws.resolveSafePath(change.relativePath, {
        workspaceRoot: change.workspacePath,
        mustExist: true
      })
    } catch (err: any) {
      return { success: false, error: `Cannot resolve safe path for revert: ${err.message}` }
    }

    try {
      const readResult = await ws.readFile(change.relativePath, {
        workspaceRoot: change.workspacePath
      })
      const currentContent = readResult.content

      // Reverse patch by swapping old/new in unified diff or using inverse patch
      const reversedPatch = this.invertUnifiedDiff(change.diffPatch)
      const revertedContent = jsdiff.applyPatch(currentContent, reversedPatch)

      if (revertedContent === false) {
        return {
          success: false,
          error: 'Reversion conflict: Current file content has diverged from patch state'
        }
      }

      await AtomicWriter.writeAtomic(safePath, revertedContent)
      this.updateStatus(id, 'reverted')

      return { success: true }
    } catch (err: any) {
      return { success: false, error: `Failed to revert file: ${err.message}` }
    }
  }

  /**
   * Inverts a unified diff patch so it can be applied in reverse.
   */
  private invertUnifiedDiff(patch: string): string {
    const parsed = jsdiff.parsePatch(patch)
    if (!parsed || parsed.length === 0) return patch

    for (const p of parsed) {
      const tempOld = p.oldFileName
      p.oldFileName = p.newFileName
      p.newFileName = tempOld

      const tempOldHeader = p.oldHeader
      p.oldHeader = p.newHeader
      p.newHeader = tempOldHeader

      for (const hunk of p.hunks) {
        const tempStart = hunk.oldStart
        hunk.oldStart = hunk.newStart
        hunk.newStart = tempStart

        const tempLines = hunk.oldLines
        hunk.oldLines = hunk.newLines
        hunk.newLines = tempLines

        hunk.lines = hunk.lines.map((line) => {
          if (line.startsWith('+')) return `-${line.slice(1)}`
          if (line.startsWith('-')) return `+${line.slice(1)}`
          return line
        })
      }
    }

    return jsdiff.formatPatch(parsed)
  }
}

