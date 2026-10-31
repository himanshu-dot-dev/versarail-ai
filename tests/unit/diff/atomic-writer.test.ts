import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { AtomicWriter } from '../../../src/main/changes/atomic-writer'

describe('AtomicWriter - Crash-Safe Atomic File Operations', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-writer-test-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('atomically creates and writes content to a new file', async () => {
    const targetFile = path.join(tmpDir, 'newfile.txt')
    const content = 'Atomic write test content'

    await AtomicWriter.writeAtomic(targetFile, content)

    const onDisk = await fs.readFile(targetFile, 'utf8')
    expect(onDisk).toBe(content)

    // Ensure no leftover .tmp files exist in directory
    const files = await fs.readdir(tmpDir)
    expect(files.filter((f) => f.endsWith('.tmp'))).toHaveLength(0)
    expect(files).toContain('newfile.txt')
  })

  it('atomically replaces an existing file content without leaving temp files', async () => {
    const targetFile = path.join(tmpDir, 'existing.txt')
    await fs.writeFile(targetFile, 'Version 1')

    await AtomicWriter.writeAtomic(targetFile, 'Version 2 (Atomic)')

    const updated = await fs.readFile(targetFile, 'utf8')
    expect(updated).toBe('Version 2 (Atomic)')

    const files = await fs.readdir(tmpDir)
    expect(files.filter((f) => f.endsWith('.tmp'))).toHaveLength(0)
  })

  it('automatically creates non-existent nested parent directories', async () => {
    const nestedFile = path.join(tmpDir, 'deep', 'nested', 'path', 'doc.md')
    const content = '# Deep Doc'

    await AtomicWriter.writeAtomic(nestedFile, content)

    const result = await fs.readFile(nestedFile, 'utf8')
    expect(result).toBe(content)
  })
})

