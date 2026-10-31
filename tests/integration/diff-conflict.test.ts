/**
 * VersaRail AI Agent Harness - Integration Test Suite
 * Diff-First Editing: Stale-Read Conflict Detection & Atomic Commits
 *
 * Verifies that:
 * 1. Proposed mutations detect concurrent external file changes.
 * 2. Pre-application conflict checks abort mutations when disk content differs from baseline.
 * 3. User modifications are preserved and never silently overwritten.
 * 4. Clean patches succeed atomically and record entries in the SQLite change journal.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { DiffService } from '../../src/main/changes/diff-service'
import { DiffEngine, FileConflictError } from '../../src/main/changes/diff-engine'
import { WorkspaceService } from '../../src/main/workspace/workspace-service'
import { SqliteDatabase } from '../../src/main/storage/sqlite-database'
import { ChangeJournal } from '../../src/main/changes/change-journal'

describe('Diff-First Mutation Engine & External Conflict Detection', () => {
  let tmpWorkspace: string
  let diffService: DiffService
  let ws: WorkspaceService
  let journal: ChangeJournal

  beforeEach(async () => {
    tmpWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'diff-conflict-test-'))
    SqliteDatabase.getInstance(':memory:')
    WorkspaceService.resetInstance()
    DiffService.resetInstance()
    ChangeJournal.resetInstance()

    ws = WorkspaceService.getInstance()
    ws.setWorkspace(tmpWorkspace)

    diffService = DiffService.getInstance()
    journal = ChangeJournal.getInstance()
  })

  afterEach(async () => {
    WorkspaceService.resetInstance()
    DiffService.resetInstance()
    ChangeJournal.resetInstance()

    try {
      await fs.rm(tmpWorkspace, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('detects external modifications during diff review and sets hasConflict true', async () => {
    const targetRel = 'src/service.ts'
    const fullPath = path.join(tmpWorkspace, targetRel)
    const initialCode = 'export const port = 3000;\n'
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, initialCode)

    const baselineHash = DiffEngine.computeSha256(initialCode)

    // Developer modifies file externally on disk
    const externalEditCode = 'export const port = 8080;\nexport const host = "localhost";\n'
    await fs.writeFile(fullPath, externalEditCode)

    // Agent attempts review with stale baseline hash
    const reviewResult = await diffService.reviewPatch({
      workspacePath: tmpWorkspace,
      relativePath: targetRel,
      baselineSha256: baselineHash,
      proposedContent: 'export const port = 4000;\n'
    })

    expect(reviewResult.hasConflict).toBe(true)
    expect(reviewResult.conflictReason).toMatch(/External modification detected/i)
  })

  it('strictly aborts patch application when disk content has diverged from baseline', async () => {
    const targetRel = 'auth.ts'
    const fullPath = path.join(tmpWorkspace, targetRel)
    const originalText = 'function login() { return true; }\n'
    await fs.writeFile(fullPath, originalText)

    const baselineHash = DiffEngine.computeSha256(originalText)
    const proposedText = 'function login() { validate(); return true; }\n'

    // Simulate concurrent user editing in VS Code while approval modal was open
    const userManualEdit = 'function login() { /* Manual user comment */ return true; }\n'
    await fs.writeFile(fullPath, userManualEdit)

    // Attempt to apply patch with outdated baselineHash
    await expect(
      diffService.applyPatch({
        workspacePath: tmpWorkspace,
        relativePath: targetRel,
        proposedContent: proposedText,
        baselineSha256: baselineHash
      })
    ).rejects.toThrow(FileConflictError)

    // CRITICAL: Disk file must still contain the user's manual edit!
    const diskContent = await fs.readFile(fullPath, 'utf8')
    expect(diskContent).toBe(userManualEdit)
    expect(diskContent).not.toBe(proposedText)
  })

  it('applies patch cleanly and atomically when baseline hash matches disk', async () => {
    const targetRel = 'utils.ts'
    const fullPath = path.join(tmpWorkspace, targetRel)
    const originalText = 'export const add = (a, b) => a + b;\n'
    await fs.writeFile(fullPath, originalText)

    const baselineHash = DiffEngine.computeSha256(originalText)
    const proposedText = 'export const add = (a: number, b: number): number => a + b;\n'

    // Apply patch with matching baselineHash
    const applyResult = await diffService.applyPatch({
      workspacePath: tmpWorkspace,
      relativePath: targetRel,
      proposedContent: proposedText,
      baselineSha256: baselineHash
    })

    expect(applyResult.success).toBe(true)
    expect(applyResult.journalId).toBeDefined()

    // File on disk must be updated cleanly
    const updatedDisk = await fs.readFile(fullPath, 'utf8')
    expect(updatedDisk).toBe(proposedText)

    // Change must be logged in SQLite journal
    const changes = journal.listChanges(tmpWorkspace)
    expect(changes.length).toBe(1)
    expect(changes[0].relativePath).toBe(targetRel)
    expect(changes[0].status).toBe('applied')
  })
})

