import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PermissionBroker } from '../../../src/main/security/permission-broker'
import { canonicalizeJson, computePayloadHash } from '../../../src/main/security/payload-hash'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'

describe('PermissionBroker & Payload Hashing', () => {
  let broker: PermissionBroker
  let db: SqliteDatabase

  beforeEach(() => {
    PermissionBroker.resetInstance()
    db = SqliteDatabase.getInstance(':memory:')
    broker = PermissionBroker.getInstance()
  })

  afterEach(() => {
    PermissionBroker.resetInstance()
  })

  it('generates deterministic SHA-256 payload hashes regardless of object key order', () => {
    const objA = {
      path: '/projects/repo/src/index.ts',
      options: { maxBytes: 1000, recursive: true },
      content: 'console.log("hello")'
    }

    // Same semantics, completely reverse/jumbled key order
    const objB = {
      content: 'console.log("hello")',
      path: '/projects/repo/src/index.ts',
      options: { recursive: true, maxBytes: 1000 }
    }

    const canonicalA = canonicalizeJson(objA)
    const canonicalB = canonicalizeJson(objB)

    expect(canonicalA).toBe(canonicalB)

    const hashA = computePayloadHash('write_file', objA)
    const hashB = computePayloadHash('write_file', objB)

    expect(hashA).toBe(hashB)
    expect(hashA).toMatch(/^[a-f0-9]{64}$/)
  })

  it('authorizes requests when approved via authorizer hook', async () => {
    broker.setAuthorizerForTesting(async (req) => {
      expect(req.capability).toBe('cmd:exec')
      expect(req.command).toBe('npm test')
      return {
        requestId: req.requestId,
        decision: 'allow',
        rememberScope: 'once'
      }
    })

    const result = await broker.requestAuthorization({
      toolName: 'execute_command',
      capability: 'cmd:exec',
      riskLevel: 'critical',
      title: 'Run Tests',
      description: 'Run npm test suite',
      command: 'npm test',
      rawArguments: { command: 'npm test' }
    })

    expect(result.granted).toBe(true)
    expect(result.scope).toBe('once')
    expect(result.payloadHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('denies execution when rejected by user decision', async () => {
    broker.setAuthorizerForTesting(async (req) => {
      return {
        requestId: req.requestId,
        decision: 'deny'
      }
    })

    const result = await broker.requestAuthorization({
      toolName: 'execute_command',
      capability: 'cmd:exec',
      riskLevel: 'critical',
      title: 'Dangerous Delete',
      description: 'Run destructive command',
      command: 'rm -rf /',
      rawArguments: { command: 'rm -rf /' }
    })

    expect(result.granted).toBe(false)
    expect(result.reason).toContain('denied')
  })

  it('remembers approvals with "session" scope for identical subsequent requests', async () => {
    let promptCount = 0

    broker.setAuthorizerForTesting(async (req) => {
      promptCount++
      return {
        requestId: req.requestId,
        decision: 'allow',
        rememberScope: 'session'
      }
    })

    const reqPayload = {
      toolName: 'read_file',
      capability: 'fs:read' as const,
      riskLevel: 'low' as const,
      title: 'Read Config',
      description: 'Read project config',
      rawArguments: { path: 'package.json' }
    }

    // First call: triggers authorizer
    const res1 = await broker.requestAuthorization(reqPayload)
    expect(res1.granted).toBe(true)
    expect(promptCount).toBe(1)

    // Second call with identical arguments: auto-granted from session cache without prompting
    const res2 = await broker.requestAuthorization(reqPayload)
    expect(res2.granted).toBe(true)
    expect(res2.scope).toBe('session')
    expect(promptCount).toBe(1) // Still 1!
  })

  it('persists approvals with "always" scope to SQLite permission_decisions', async () => {
    broker.setAuthorizerForTesting(async (req) => {
      return {
        requestId: req.requestId,
        decision: 'allow',
        rememberScope: 'always'
      }
    })

    const reqPayload = {
      toolName: 'list_directory',
      capability: 'fs:read' as const,
      riskLevel: 'low' as const,
      title: 'List Root',
      description: 'List workspace files',
      rawArguments: { path: '.' }
    }

    const res = await broker.requestAuthorization(reqPayload)
    expect(res.granted).toBe(true)

    // Verify row in SQLite
    const row = db.prepare('SELECT * FROM permission_decisions WHERE payload_hash = ?').get(res.payloadHash) as any
    expect(row).toBeDefined()
    expect(row.capability).toBe('fs:read')
    expect(row.decision).toBe('allow')
    expect(row.remember_scope).toBe('always')
  })

  it('denies requests that exceed timeout duration', async () => {
    // Request with short 50ms timeout and no authorizer resolving it
    const reqPromise = broker.requestAuthorization(
      {
        toolName: 'execute_command',
        capability: 'cmd:exec',
        riskLevel: 'critical',
        title: 'Unattended Command',
        description: 'Waiting for non-existent user response',
        rawArguments: { command: 'echo waiting' }
      },
      50 // 50ms timeout
    )

    const result = await reqPromise
    expect(result.granted).toBe(false)
    expect(result.reason).toContain('timed out')
  })
})

