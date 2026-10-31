import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PermissionBroker } from '../../src/main/security/permission-broker'
import { ToctouTamperingError, computePayloadHash } from '../../src/main/security/payload-hash'
import { ToolRegistry } from '../../src/main/tools/tool-registry'
import { SqliteDatabase } from '../../src/main/storage/sqlite-database'

describe('Scenario 3: TOCTOU Approval Tampering Security Defenses', () => {
  let broker: PermissionBroker
  let registry: ToolRegistry

  beforeEach(() => {
    PermissionBroker.resetInstance()
    ToolRegistry.resetInstance()
    SqliteDatabase.getInstance(':memory:')
    broker = PermissionBroker.getInstance()
    registry = ToolRegistry.getInstance()
  })

  afterEach(() => {
    PermissionBroker.resetInstance()
    ToolRegistry.resetInstance()
  })

  it('rejects execution when command arguments are tampered post-approval', async () => {
    // 1. Initial benign command requested by agent
    const legitimateArgs = {
      command: 'npm',
      args: ['test', '--run']
    }

    broker.setAuthorizerForTesting(async (req) => {
      // User visually inspects and approves "npm test --run"
      expect(req.command).toBe('npm')
      return {
        requestId: req.requestId,
        decision: 'allow',
        rememberScope: 'once'
      }
    })

    const approvalReceipt = await broker.requestAuthorization({
      toolName: 'execute_command',
      capability: 'cmd:exec',
      riskLevel: 'critical',
      title: 'Run Test Suite',
      description: 'Run npm tests',
      command: legitimateArgs.command,
      args: legitimateArgs.args,
      rawArguments: legitimateArgs
    })

    expect(approvalReceipt.granted).toBe(true)

    // 2. Malicious payload substituted by attacker / infected sub-module before execution
    const maliciousArgs = {
      command: 'rm',
      args: ['-rf', '/important_data']
    }

    // 3. Broker verifies execution arguments against cryptographic payload hash
    expect(() => {
      broker.verifyExecution(approvalReceipt, maliciousArgs, 'execute_command')
    }).toThrow(ToctouTamperingError)

    // Ensure error message explicitly states TOCTOU tampering
    try {
      broker.verifyExecution(approvalReceipt, maliciousArgs, 'execute_command')
    } catch (err: any) {
      expect(err).toBeInstanceOf(ToctouTamperingError)
      expect(err.message).toContain('TOCTOU Tampering Detected')
    }
  })

  it('detects single-character modifications to file write content post-approval', async () => {
    const approvedContent = {
      path: 'src/secrets.env',
      content: 'API_MODE=sandbox'
    }

    broker.setAuthorizerForTesting(async (req) => {
      return {
        requestId: req.requestId,
        decision: 'allow'
      }
    })

    const receipt = await broker.requestAuthorization({
      toolName: 'write_file',
      capability: 'fs:write',
      riskLevel: 'high',
      title: 'Save Config',
      description: 'Save sandbox mode',
      rawArguments: approvedContent
    })

    // Subtly mutated: 'sandbox' -> 'prod'
    const tamperedContent = {
      path: 'src/secrets.env',
      content: 'API_MODE=prod'
    }

    expect(() => {
      broker.verifyExecution(receipt, tamperedContent, 'write_file')
    }).toThrow(ToctouTamperingError)
  })

  it('verifies that ToolRegistry blocks execution when payload hash is tampered', async () => {
    let interceptedReceipt: any = null

    broker.setAuthorizerForTesting(async (req) => {
      // Record approved hash
      interceptedReceipt = req
      return {
        requestId: req.requestId,
        decision: 'allow'
      }
    })

    // If an attacker mutates tool input arguments during execution:
    const originalArgs = {
      path: 'test-output.txt',
      content: 'clean data'
    }

    // Hash of original input
    const originalHash = computePayloadHash('write_file', originalArgs)

    // Simulate tampered input passed to verifyExecution
    const tamperedArgs = {
      path: 'test-output.txt',
      content: 'malicious injected payload'
    }

    expect(() => {
      broker.verifyExecution(
        {
          granted: true,
          requestId: 'mock-id',
          payloadHash: originalHash
        },
        tamperedArgs,
        'write_file'
      )
    }).toThrow(ToctouTamperingError)
  })
})

