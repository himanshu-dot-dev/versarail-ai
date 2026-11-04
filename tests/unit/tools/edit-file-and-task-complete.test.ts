import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EditFileTool } from '../../../src/main/tools/builtin/edit-file.tool'
import { TaskCompleteTool } from '../../../src/main/tools/builtin/task-complete.tool'
import { ToolRegistry } from '../../../src/main/tools/tool-registry'
import { WorkspaceService } from '../../../src/main/workspace/workspace-service'
import { ContextManager } from '../../../src/main/agent/context-manager'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('Surgical Edit Tool & Task Complete Contract', () => {
  let tempDir: string
  let workspace: WorkspaceService
  let editTool: EditFileTool
  let completeTool: TaskCompleteTool

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-edit-test-'))
    SqliteDatabase.resetInstance()
    SqliteDatabase.getInstance(':memory:')
    ToolRegistry.resetInstance()

    workspace = WorkspaceService.getInstance()
    workspace.setWorkspace(tempDir)

    editTool = new EditFileTool()
    completeTool = new TaskCompleteTool()
  })

  afterEach(() => {
    try {
      SqliteDatabase.resetInstance()
    } catch {
      // Ignore
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('surgically replaces a specific block in a file without rewriting the whole file', async () => {
    const filePath = path.join(tempDir, 'example.ts')
    const originalContent = `function hello() {\n  console.log("old message")\n  return 42\n}\n`
    fs.writeFileSync(filePath, originalContent, 'utf8')

    const result = await editTool.execute(
      {
        path: 'example.ts',
        targetContent: '  console.log("old message")',
        replacementContent: '  console.log("new updated message")'
      },
      { workspacePath: tempDir }
    )

    expect(result.success).toBe(true)
    expect(result.replacements).toBe(1)

    const updated = fs.readFileSync(filePath, 'utf8')
    expect(updated).toContain('console.log("new updated message")')
    expect(updated).toContain('return 42')
  })

  it('tolerates CRLF vs LF line endings when matching target content block', async () => {
    const filePath = path.join(tempDir, 'crlf.ts')
    const originalContent = "const a = 1;\r\nconst b = 2;\r\nconst c = 3;\r\n"
    fs.writeFileSync(filePath, originalContent, 'utf8')

    const result = await editTool.execute(
      {
        path: 'crlf.ts',
        targetContent: "const b = 2;\n",
        replacementContent: "const b = 200;\n"
      },
      { workspacePath: tempDir }
    )

    expect(result.success).toBe(true)
    const updated = fs.readFileSync(filePath, 'utf8')
    expect(updated).toContain('const b = 200;')
  })

  it('throws a helpful descriptive error if target content is not found', async () => {
    const filePath = path.join(tempDir, 'missing.ts')
    fs.writeFileSync(filePath, 'const x = 100;', 'utf8')

    await expect(
      editTool.execute(
        {
          path: 'missing.ts',
          targetContent: 'const y = 999;',
          replacementContent: 'const y = 1000;'
        },
        { workspacePath: tempDir }
      )
    ).rejects.toThrow('Target content block was not found')
  })

  it('generates a clean unified diff preview in permission request details', () => {
    const details = editTool.formatPermissionRequest(
      {
        path: 'app.ts',
        targetContent: 'const mode = "dev"',
        replacementContent: 'const mode = "prod"'
      },
      { workspacePath: tempDir }
    )

    expect(details.title).toContain('Surgical Edit')
    expect(details.diffPreview).toContain('--- TARGET (TO REMOVE) ---')
    expect(details.diffPreview).toContain('- const mode = "dev"')
    expect(details.diffPreview).toContain('+++ REPLACEMENT (TO INSERT) +++')
    expect(details.diffPreview).toContain('+ const mode = "prod"')
  })

  it('completes task and returns clean summary via task_complete tool', async () => {
    const result = await completeTool.execute(
      {
        summary: 'All unit tests written and passing successfully.'
      },
      {}
    )

    expect(result.completed).toBe(true)
    expect(result.summary).toBe('All unit tests written and passing successfully.')
  })

  it('resolves tools and aliases from ToolRegistry', () => {
    const registry = ToolRegistry.getInstance()
    expect(registry.getTool('edit_file')).toBeDefined()
    expect(registry.getTool('modify_file')).toBeDefined()
    expect(registry.getTool('task_complete')).toBeDefined()
    expect(registry.getTool('complete_task')).toBeDefined()
  })
})

describe('Pool-Aware Context Compaction in ContextManager', () => {
  let contextManager: ContextManager

  beforeEach(() => {
    SqliteDatabase.resetInstance()
    SqliteDatabase.getInstance(':memory:')
    contextManager = ContextManager.getInstance()
  })

  it('calculates the context floor based on 75% of the minimum pool candidate context', () => {
    const candidates = [
      { contextWindow: 1_000_000 }, // Gemini
      { contextWindow: 128_000 },   // Groq
      { contextWindow: 32_768 }     // Mistral Small
    ]

    const floor = contextManager.calculatePoolContextFloor(candidates)
    // 75% of 32,768 = 24,576
    expect(floor).toBe(Math.floor(32768 * 0.75))
  })

  it('compacts verbose older tool results when messages exceed the pool floor', () => {
    const longOutput = 'x'.repeat(10000)
    const messages = [
      { role: 'system' as const, content: 'You are VersaRail AI' },
      { role: 'user' as const, content: 'Read package.json' },
      { role: 'assistant' as const, content: 'I will read package.json' },
      { role: 'user' as const, content: `[Tool Output for read_file]:\n${longOutput}\n\nPlease proceed` },
      { role: 'assistant' as const, content: 'File looks good. Next step...' },
      { role: 'user' as const, content: 'What is next?' }
    ]

    const compacted = contextManager.compactToolLoopContext(messages, 2000)
    expect(compacted.length).toBeGreaterThan(0)

    const toolResultMsg = compacted.find((m) => m.content.includes('[Tool Output for read_file]'))
    if (toolResultMsg) {
      expect(toolResultMsg.content).toContain('[Tool result content cleared for context economy]')
    }
  })
})

