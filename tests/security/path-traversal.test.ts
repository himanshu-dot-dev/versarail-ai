/**
 * VersaRail AI Agent Harness - Security Penetration Test Suite
 * Scenario 2: Symlink Escape & Path Traversal Outside Workspace
 *
 * Verifies that:
 * 1. Directory traversal sequences (../../../../etc/passwd, ..\..\..\Windows\win.ini) are blocked.
 * 2. Symbolic links / junctions pointing outside the workspace are blocked via fs.realpathSync.
 * 3. Dangling symbolic links pointing outside the workspace are rejected.
 * 4. Default sensitive file and folder exclusions (.env, .git, .ssh, node_modules, private keys) are blocked.
 * 5. Symlinks pointing to sensitive internal files (.env) are rejected.
 * 6. ToolRegistry built-in tools (read_file, write_file, file_search) strictly enforce containment.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import * as os from 'os'
import { WorkspaceService } from '../../src/main/workspace/workspace-service'
import {
  AccessDeniedError,
  PathTraversalError,
  SymlinkEscapeError,
  SensitiveFileExclusionError
} from '../../src/main/workspace/path-canonicalizer'
import { ToolRegistry } from '../../src/main/tools/tool-registry'
import { PermissionBroker } from '../../src/main/security/permission-broker'
import { SqliteDatabase } from '../../src/main/storage/sqlite-database'

describe('Scenario 2: Symlink Escape & Path Traversal Security Defenses', () => {
  let tmpRoot: string
  let outsideDir: string
  let outsideSecretFile: string
  let workspaceService: WorkspaceService
  let toolRegistry: ToolRegistry
  let permissionBroker: PermissionBroker

  beforeEach(async () => {
    // 1. Create isolated test folders: tmpRoot (workspace) and outsideDir (host filesystem)
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sec-workspace-'))
    outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sec-outside-'))

    // 2. Create sensitive file in the outside directory
    outsideSecretFile = path.join(outsideDir, 'host_secret.key')
    await fs.writeFile(outsideSecretFile, 'CRITICAL_HOST_KEY_DO_NOT_LEAK')

    // 3. Reset Singletons
    WorkspaceService.resetInstance()
    ToolRegistry.resetInstance()
    PermissionBroker.resetInstance()
    SqliteDatabase.getInstance(':memory:')

    workspaceService = WorkspaceService.getInstance()
    workspaceService.setWorkspace(tmpRoot)

    toolRegistry = ToolRegistry.getInstance()
    permissionBroker = PermissionBroker.getInstance()

    // Auto-approve test authorizer
    permissionBroker.setAuthorizerForTesting(async (req) => ({
      requestId: req.requestId,
      decision: 'allow',
      rememberScope: 'session'
    }))
  })

  afterEach(async () => {
    WorkspaceService.resetInstance()
    ToolRegistry.resetInstance()
    PermissionBroker.resetInstance()

    try {
      await fs.rm(tmpRoot, { recursive: true, force: true })
      await fs.rm(outsideDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('strictly blocks relative directory traversal sequences (../../../../etc/passwd)', async () => {
    // Attempt relative traversal out of workspace
    const traversalPayloads = [
      '../../../../etc/passwd',
      '..\\..\\..\\Windows\\win.ini',
      'subfolder/../../../../etc/shadow',
      './../../outside_file.txt',
      'nested/../../../../../../../../etc/hosts'
    ]

    for (const maliciousPath of traversalPayloads) {
      // Must throw AccessDeniedError / PathTraversalError
      expect(() => workspaceService.resolveSafePath(maliciousPath)).toThrow(AccessDeniedError)
      await expect(workspaceService.readFile(maliciousPath)).rejects.toThrow(AccessDeniedError)
    }
  })

  it('rejects null byte injection attacks in file paths', async () => {
    const nullBytePaths = [
      'legit.txt\0/../../../../etc/passwd',
      'source.ts\0.key',
      'README.md\0/../../secret.txt'
    ]

    for (const maliciousPath of nullBytePaths) {
      expect(() => workspaceService.resolveSafePath(maliciousPath)).toThrow(PathTraversalError)
    }
  })

  it('detects and blocks symlinks/junctions pointing outside workspace root', async () => {
    const linkPath = path.join(tmpRoot, 'outside_escape_link')

    // Create a directory junction (supported without admin privileges on Windows)
    try {
      fsSync.symlinkSync(outsideDir, linkPath, 'junction')
    } catch {
      // On Unix platforms fallback to standard dir symlink
      fsSync.symlinkSync(outsideDir, linkPath, 'dir')
    }

    // Attempt to access outside secret through the symlink/junction
    const escapedFilePath = path.join(linkPath, 'host_secret.key')

    // Must throw AccessDeniedError / SymlinkEscapeError
    expect(() => workspaceService.resolveSafePath(escapedFilePath)).toThrow(AccessDeniedError)
    await expect(workspaceService.readFile(escapedFilePath)).rejects.toThrow(AccessDeniedError)
  })

  it('rejects dangling symbolic links pointing outside workspace', () => {
    const danglingLinkPath = path.join(tmpRoot, 'dangling_outside_link')
    const nonExistentOutsideTarget = path.join(outsideDir, 'non_existent_target.txt')

    try {
      fsSync.symlinkSync(nonExistentOutsideTarget, danglingLinkPath, 'junction')
    } catch {
      try {
        fsSync.symlinkSync(nonExistentOutsideTarget, danglingLinkPath, 'file')
      } catch {
        // If unprivileged OS forbids file symlinks, test directory junction
        fsSync.symlinkSync(path.join(outsideDir, 'missing_dir'), danglingLinkPath, 'junction')
      }
    }

    expect(() => workspaceService.resolveSafePath('dangling_outside_link')).toThrow(
      AccessDeniedError
    )
  })

  it('strictly blocks access to default sensitive environment and credential files', async () => {
    // Create sensitive files directly inside workspace
    await fs.writeFile(path.join(tmpRoot, '.env'), 'OPENAI_API_KEY=sk-test1234')
    await fs.writeFile(path.join(tmpRoot, '.env.local'), 'LOCAL_SECRET=5678')
    await fs.writeFile(path.join(tmpRoot, 'server.key'), '-----BEGIN PRIVATE KEY-----')
    await fs.writeFile(path.join(tmpRoot, 'cert.pem'), '-----BEGIN CERTIFICATE-----')

    await fs.mkdir(path.join(tmpRoot, '.git'))
    await fs.writeFile(path.join(tmpRoot, '.git', 'config'), '[core] repositoryformatversion = 0')

    await fs.mkdir(path.join(tmpRoot, 'node_modules'))
    await fs.writeFile(path.join(tmpRoot, 'node_modules', 'dep.js'), 'module.exports = {}')

    // All these accesses must be rejected with SensitiveFileExclusionError
    const sensitiveFiles = [
      '.env',
      '.env.local',
      'server.key',
      'cert.pem',
      '.git/config',
      'node_modules/dep.js'
    ]

    for (const sensitive of sensitiveFiles) {
      expect(() => workspaceService.resolveSafePath(sensitive)).toThrow(
        SensitiveFileExclusionError
      )
      await expect(workspaceService.readFile(sensitive)).rejects.toThrow(
        SensitiveFileExclusionError
      )
    }
  })

  it('blocks symlinks pointing to internal sensitive files (.env)', async () => {
    // Create internal .env
    const envFile = path.join(tmpRoot, '.env')
    await fs.writeFile(envFile, 'DB_PASSWORD=secret')

    // Create a symlink named "innocent.txt" pointing to internal .env
    const linkPath = path.join(tmpRoot, 'innocent_alias')
    try {
      fsSync.symlinkSync(envFile, linkPath, 'file')
    } catch {
      // If OS requires elevation for file symlink, test junction to sensitive directory (.git)
      const gitDir = path.join(tmpRoot, '.git')
      await fs.mkdir(gitDir, { recursive: true })
      fsSync.symlinkSync(gitDir, linkPath, 'junction')
    }

    // Resolving innocent_alias must reject access because real target is sensitive!
    expect(() => workspaceService.resolveSafePath('innocent_alias')).toThrow(
      SensitiveFileExclusionError
    )
  })

  it('verifies that ToolRegistry built-in tools reject path traversal attempts', async () => {
    // 1. read_file tool with directory traversal
    const readTraversal = await toolRegistry.executeTool(
      'read_file',
      { path: '../../../../etc/passwd' },
      { workspacePath: tmpRoot }
    )
    expect(readTraversal.success).toBe(false)
    expect(readTraversal.error).toMatch(/Path traversal attempt detected|Access denied/i)

    // 2. read_file tool on .env
    await fs.writeFile(path.join(tmpRoot, '.env'), 'AWS_SECRET=xyz')
    const readEnv = await toolRegistry.executeTool(
      'read_file',
      { path: '.env' },
      { workspacePath: tmpRoot }
    )
    expect(readEnv.success).toBe(false)
    expect(readEnv.error).toMatch(/sensitive exclusion|Access denied/i)

    // 3. write_file tool attempting traversal
    const writeTraversal = await toolRegistry.executeTool(
      'write_file',
      { path: '../../../../malicious.txt', content: 'hacked' },
      { workspacePath: tmpRoot }
    )
    expect(writeTraversal.success).toBe(false)
    expect(writeTraversal.error).toMatch(/Path traversal attempt detected|Access denied/i)

    // 4. write_file tool attempting to overwrite .env
    const writeEnv = await toolRegistry.executeTool(
      'write_file',
      { path: '.env', content: 'MUTATED=true' },
      { workspacePath: tmpRoot }
    )
    expect(writeEnv.success).toBe(false)
    expect(writeEnv.error).toMatch(/sensitive exclusion|Access denied/i)
  })

  it('verifies that file_search tool executes safely without exposing sensitive files', async () => {
    // Create valid source files
    await fs.mkdir(path.join(tmpRoot, 'src'))
    await fs.writeFile(path.join(tmpRoot, 'src', 'app.ts'), 'export const app = {}')
    await fs.writeFile(path.join(tmpRoot, 'src', 'config.ts'), 'export const config = {}')

    // Create sensitive files
    await fs.writeFile(path.join(tmpRoot, '.env'), 'SECRET=123')
    await fs.writeFile(path.join(tmpRoot, 'src', 'private.key'), 'PRIVATE')
    await fs.mkdir(path.join(tmpRoot, 'node_modules'))
    await fs.writeFile(path.join(tmpRoot, 'node_modules', 'dep.ts'), 'export const dep = 1')

    const searchResult = await toolRegistry.executeTool(
      'file_search',
      { query: '', extension: 'ts' },
      { workspacePath: tmpRoot }
    )

    expect(searchResult.success).toBe(true)
    const matches = (searchResult.result as any).matches as Array<{ relativePath: string }>
    const matchedPaths = matches.map((m) => m.relativePath)

    // Legitimate files are found
    expect(matchedPaths).toContain('src/app.ts')
    expect(matchedPaths).toContain('src/config.ts')

    // Sensitive files are NEVER included
    expect(matchedPaths).not.toContain('.env')
    expect(matchedPaths).not.toContain('src/private.key')
    expect(matchedPaths).not.toContain('node_modules/dep.ts')
  })
})

