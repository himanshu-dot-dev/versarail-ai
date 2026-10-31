import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { ToolRegistry } from '../../../src/main/tools/tool-registry'
import { PermissionBroker } from '../../../src/main/security/permission-broker'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import { ConversationStore } from '../../../src/main/storage/conversation-store'

describe('Built-in Tools & ToolRegistry Execution', () => {
  let tmpDir: string
  let registry: ToolRegistry
  let broker: PermissionBroker
  let convStore: ConversationStore

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-test-'))
    PermissionBroker.resetInstance()
    ToolRegistry.resetInstance()
    SqliteDatabase.getInstance(':memory:')
    broker = PermissionBroker.getInstance()
    registry = ToolRegistry.getInstance()
    convStore = ConversationStore.getInstance()

    // Default test auto-approver
    broker.setAuthorizerForTesting(async (req) => ({
      requestId: req.requestId,
      decision: 'allow',
      rememberScope: 'session'
    }))
  })

  afterEach(async () => {
    PermissionBroker.resetInstance()
    ToolRegistry.resetInstance()
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('writes and reads a file successfully through ToolRegistry', async () => {
    const testFile = path.join(tmpDir, 'hello.txt')
    const fileContent = 'Hello, VersaRail AI Agent Harness!'

    // 1. Write file
    const writeResult = await registry.executeTool(
      'write_file',
      { path: testFile, content: fileContent },
      { workspacePath: tmpDir }
    )

    expect(writeResult.success).toBe(true)
    expect((writeResult.result as any).bytesWritten).toBe(Buffer.byteLength(fileContent, 'utf8'))

    // 2. Read file
    const readResult = await registry.executeTool(
      'read_file',
      { path: testFile },
      { workspacePath: tmpDir }
    )

    expect(readResult.success).toBe(true)
    expect((readResult.result as any).content).toBe(fileContent)
    expect((readResult.result as any).isTruncated).toBe(false)
  })

  it('lists directory entries with list_directory', async () => {
    // Create dummy files
    await fs.writeFile(path.join(tmpDir, 'file1.txt'), 'data1')
    await fs.writeFile(path.join(tmpDir, 'file2.txt'), 'data2')
    await fs.mkdir(path.join(tmpDir, 'subdir'))

    const listResult = await registry.executeTool(
      'list_directory',
      { path: tmpDir },
      { workspacePath: tmpDir }
    )

    expect(listResult.success).toBe(true)
    const entries = (listResult.result as any).entries as Array<{ name: string; isDirectory: boolean }>
    const names = entries.map((e) => e.name)

    expect(names).toContain('file1.txt')
    expect(names).toContain('file2.txt')
    expect(names).toContain('subdir')
  })

  it('executes system command and automatically redacts credentials from output', async () => {
    // Simulated command output containing a leaked OpenAI and Gemini API key
    const mockSecret = 'sk-proj-abcde1234567890123456789012345678901234567890123'
    const command = process.platform === 'win32' ? 'node' : 'node'
    const script = `console.log("Found key: ${mockSecret}");`

    const execResult = await registry.executeTool(
      'execute_command',
      { command, args: ['-e', script] },
      { workspacePath: tmpDir }
    )

    expect(execResult.success).toBe(true)
    const stdout = (execResult.result as any).stdout as string

    // Secret must be redacted!
    expect(stdout).not.toContain(mockSecret)
    expect(stdout).toContain('[REDACTED_SECRET]')
  })

  it('enforces permission rejection when authorizer denies execution', async () => {
    broker.setAuthorizerForTesting(async (req) => ({
      requestId: req.requestId,
      decision: 'deny'
    }))

    const result = await registry.executeTool(
      'execute_command',
      { command: 'node', args: ['-v'] },
      { workspacePath: tmpDir }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('denied')
  })

  it('records tool calls in SQLite audit log during agent runs', async () => {
    // Create conversation and run
    const conv = convStore.createConversation({ title: 'Tool Audit Run', selectedModel: 'test-model' })
    const run = convStore.createRun({ conversationId: conv.id, initialProvider: 'groq' })

    const testFile = path.join(tmpDir, 'audit.txt')
    await registry.executeTool(
      'write_file',
      { path: testFile, content: 'audit logged' },
      { runId: run.id, workspacePath: tmpDir }
    )

    const calls = convStore.getToolCallsForRun(run.id)
    expect(calls.length).toBe(1)
    expect(calls[0].toolName).toBe('write_file')
    expect(calls[0].status).toBe('success')
    expect(calls[0].executionDurationMs).toBeGreaterThanOrEqual(0)
  })
})

