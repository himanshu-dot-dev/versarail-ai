import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { WorkspaceService } from '../../../src/main/workspace/workspace-service'
import { AccessDeniedError } from '../../../src/main/workspace/path-canonicalizer'

describe('WorkspaceService - Workspace Management & Safe Filesystem', () => {
  let tmpRoot: string
  let service: WorkspaceService

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-service-test-'))
    WorkspaceService.resetInstance()
    service = WorkspaceService.getInstance()
    service.setWorkspace(tmpRoot)
  })

  afterEach(async () => {
    WorkspaceService.resetInstance()
    try {
      await fs.rm(tmpRoot, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('sets and retrieves active workspace status', () => {
    const ws = service.getCurrentWorkspace()
    expect(ws.path).toBeDefined()
    expect(ws.name).toBe(path.basename(tmpRoot))
    expect(service.getWorkspaceRoot()).toBe(ws.path)
  })

  it('safely reads small and large files with truncation limits', async () => {
    const testFile = path.join(tmpRoot, 'notes.txt')
    const sampleText = 'Line 1: VersaRail\nLine 2: AI Agent Workstation'
    await fs.writeFile(testFile, sampleText)

    // Standard read
    const result = await service.readFile('notes.txt')
    expect(result.content).toBe(sampleText)
    expect(result.bytesRead).toBe(Buffer.byteLength(sampleText, 'utf8'))
    expect(result.isTruncated).toBe(false)

    // Truncated read
    const truncated = await service.readFile('notes.txt', { maxBytes: 10 })
    expect(truncated.content.length).toBe(10)
    expect(truncated.isTruncated).toBe(true)
  })

  it('inspects directory contents and suppresses sensitive files', async () => {
    // Normal files and directories
    await fs.mkdir(path.join(tmpRoot, 'src'))
    await fs.writeFile(path.join(tmpRoot, 'src', 'index.ts'), 'console.log("hi")')
    await fs.writeFile(path.join(tmpRoot, 'package.json'), '{}')

    // Sensitive entries that must be excluded
    await fs.mkdir(path.join(tmpRoot, '.git'))
    await fs.mkdir(path.join(tmpRoot, 'node_modules'))
    await fs.writeFile(path.join(tmpRoot, '.env'), 'SECRET_KEY=123')
    await fs.writeFile(path.join(tmpRoot, 'private.key'), 'PRIVATE_KEY')

    const inspection = await service.inspectFiles('.')
    expect(inspection.dirs).toContain('src')
    expect(inspection.dirs).not.toContain('.git')
    expect(inspection.dirs).not.toContain('node_modules')

    expect(inspection.files).toContain('package.json')
    expect(inspection.files).not.toContain('.env')
    expect(inspection.files).not.toContain('private.key')
  })

  it('searches workspace files bounded by query and extension filters', async () => {
    await fs.mkdir(path.join(tmpRoot, 'lib'))
    await fs.writeFile(path.join(tmpRoot, 'lib', 'math.ts'), 'export const add = 1')
    await fs.writeFile(path.join(tmpRoot, 'lib', 'string.ts'), 'export const str = ""')
    await fs.writeFile(path.join(tmpRoot, 'lib', 'readme.md'), '# Lib')
    await fs.writeFile(path.join(tmpRoot, 'lib', '.env'), 'SECRET=bad')

    // Search by extension .ts
    const tsFiles = await service.searchFiles({ extension: 'ts' })
    const rels = tsFiles.map((f) => f.relativePath)
    expect(rels).toContain('lib/math.ts')
    expect(rels).toContain('lib/string.ts')
    expect(rels).not.toContain('lib/readme.md')
    expect(rels).not.toContain('lib/.env')

    // Search by query
    const mathFiles = await service.searchFiles({ query: 'math' })
    expect(mathFiles.length).toBe(1)
    expect(mathFiles[0].relativePath).toBe('lib/math.ts')
  })

  it('throws AccessDeniedError if attempting operations without active workspace', () => {
    service.clearWorkspace()
    expect(() => service.resolveSafePath('some-file.txt')).toThrow(AccessDeniedError)
  })
})

