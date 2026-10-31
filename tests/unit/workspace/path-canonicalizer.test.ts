import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import {
  PathCanonicalizer,
  PathTraversalError,
  SensitiveFileExclusionError
} from '../../../src/main/workspace/path-canonicalizer'

describe('PathCanonicalizer - Canonical Path Verification', () => {
  let tmpRoot: string

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'path-canonicalizer-test-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(tmpRoot, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('canonicalizes valid existing workspace root', () => {
    const canonical = PathCanonicalizer.canonicalizeRoot(tmpRoot)
    expect(canonical).toBeDefined()
    expect(path.isAbsolute(canonical)).toBe(true)
  })

  it('rejects non-existent directory as workspace root', () => {
    const invalidPath = path.join(tmpRoot, 'non_existent_dir_123')
    expect(() => PathCanonicalizer.canonicalizeRoot(invalidPath)).toThrow(/does not exist/)
  })

  it('rejects null byte in workspace root path', () => {
    const malicious = `${tmpRoot}\0/foo`
    expect(() => PathCanonicalizer.canonicalizeRoot(malicious)).toThrow(PathTraversalError)
  })

  it('correctly assesses path containment via isContained', async () => {
    const insideFile = path.join(tmpRoot, 'file.txt')
    await fs.writeFile(insideFile, 'content')

    expect(PathCanonicalizer.isContained(tmpRoot, insideFile)).toBe(true)

    const outsidePath = path.resolve(tmpRoot, '..', 'some_outside_file.txt')
    expect(PathCanonicalizer.isContained(tmpRoot, outsidePath)).toBe(false)
  })

  it('resolves safe relative and absolute paths within workspace', async () => {
    const safeFile = path.join(tmpRoot, 'hello.txt')
    await fs.writeFile(safeFile, 'world')

    const resolvedRel = PathCanonicalizer.resolveSafePath(tmpRoot, 'hello.txt')
    expect(resolvedRel.toLowerCase()).toBe(safeFile.toLowerCase())

    const resolvedAbs = PathCanonicalizer.resolveSafePath(tmpRoot, safeFile)
    expect(resolvedAbs.toLowerCase()).toBe(safeFile.toLowerCase())
  })

  it('rejects null byte in target path', () => {
    expect(() =>
      PathCanonicalizer.resolveSafePath(tmpRoot, 'hello.txt\0/etc/passwd')
    ).toThrow(PathTraversalError)
  })

  it('rejects relative traversal attempts escaping workspace', () => {
    expect(() =>
      PathCanonicalizer.resolveSafePath(tmpRoot, '../../../../etc/passwd')
    ).toThrow(PathTraversalError)

    expect(() =>
      PathCanonicalizer.resolveSafePath(tmpRoot, 'subdir/../../../../Windows/win.ini')
    ).toThrow(PathTraversalError)
  })

  it('rejects non-existent file when mustExist is true', () => {
    expect(() =>
      PathCanonicalizer.resolveSafePath(tmpRoot, 'missing.txt', { mustExist: true })
    ).toThrow(/does not exist/)
  })

  it('rejects sensitive files via ExclusionFilter during resolution', async () => {
    const envFile = path.join(tmpRoot, '.env')
    await fs.writeFile(envFile, 'SECRET=123')

    expect(() =>
      PathCanonicalizer.resolveSafePath(tmpRoot, '.env')
    ).toThrow(SensitiveFileExclusionError)
  })
})

