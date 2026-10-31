import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { ChangeJournal } from '../../../src/main/changes/change-journal'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import { WorkspaceService } from '../../../src/main/workspace/workspace-service'
import { DiffEngine } from '../../../src/main/changes/diff-engine'

describe('ChangeJournal - SQLite Mutation Persistence & Revert Engine', () => {
  let tmpWorkspace: string
  let journal: ChangeJournal
  let ws: WorkspaceService

  beforeEach(async () => {
    tmpWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'change-journal-test-'))
    SqliteDatabase.getInstance(':memory:')
    WorkspaceService.resetInstance()
    ChangeJournal.resetInstance()

    ws = WorkspaceService.getInstance()
    ws.setWorkspace(tmpWorkspace)
    journal = ChangeJournal.getInstance()
  })

  afterEach(async () => {
    WorkspaceService.resetInstance()
    ChangeJournal.resetInstance()
    try {
      await fs.rm(tmpWorkspace, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('records and retrieves a file mutation entry', () => {
    const entryId = journal.recordChange({
      workspacePath: tmpWorkspace,
      relativePath: 'src/config.ts',
      baselineSha256: 'abc123hash',
      diffPatch: '--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1 +1 @@\n-old\n+new',
      status: 'applied'
    })

    expect(entryId).toBeDefined()
    const retrieved = journal.getChange(entryId)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.relativePath).toBe('src/config.ts')
    expect(retrieved?.status).toBe('applied')
    expect(retrieved?.baselineSha256).toBe('abc123hash')
  })

  it('lists recent changes for a workspace', () => {
    journal.recordChange({
      workspacePath: tmpWorkspace,
      relativePath: 'file1.txt',
      baselineSha256: 'hash1',
      diffPatch: 'patch1'
    })

    journal.recordChange({
      workspacePath: tmpWorkspace,
      relativePath: 'file2.txt',
      baselineSha256: 'hash2',
      diffPatch: 'patch2'
    })

    const list = journal.listChanges(tmpWorkspace)
    expect(list.length).toBe(2)
    const files = list.map((c) => c.relativePath)
    expect(files).toContain('file1.txt')
    expect(files).toContain('file2.txt')
  })

  it('reverts an applied mutation back to baseline state', async () => {
    const testFile = path.join(tmpWorkspace, 'revertible.txt')
    const originalContent = 'First Line\nSecond Line\nThird Line\n'
    const modifiedContent = 'First Line\nModified Second Line\nThird Line\n'

    await fs.writeFile(testFile, modifiedContent)
    const baselineSha = DiffEngine.computeSha256(originalContent)

    const diff = DiffEngine.createUnifiedDiff({
      filePath: 'revertible.txt',
      originalContent,
      newContent: modifiedContent
    })

    const journalId = journal.recordChange({
      workspacePath: tmpWorkspace,
      relativePath: 'revertible.txt',
      baselineSha256: baselineSha,
      diffPatch: diff.patch,
      status: 'applied'
    })

    // Execute revert
    const revertResult = await journal.revertChange(journalId)
    expect(revertResult.success).toBe(true)

    // Verify on-disk file content was reverted to original
    const diskContent = await fs.readFile(testFile, 'utf8')
    expect(diskContent).toBe(originalContent)

    // Journal status should be updated
    const updatedRecord = journal.getChange(journalId)
    expect(updatedRecord?.status).toBe('reverted')
  })
})

