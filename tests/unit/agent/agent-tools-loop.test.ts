import { describe, it, expect, beforeEach } from 'vitest'
import { buildAgentSystemPrompt } from '../../../src/main/agent/system-prompt'
import {
  BUILTIN_TOOL_DEFINITIONS,
  extractInlineToolCalls
} from '../../../src/main/tools/builtin-tool-definitions'
import { ToolRegistry } from '../../../src/main/tools/tool-registry'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import { PermissionBroker } from '../../../src/main/security/permission-broker'

describe('Agent Harness System Prompt & Tool Calling Loop', () => {
  beforeEach(() => {
    SqliteDatabase.resetInstance()
    SqliteDatabase.getInstance(':memory:')
    PermissionBroker.resetInstance()
    ToolRegistry.resetInstance()
  })

  it('builds comprehensive agent system prompt with workspace path', () => {
    const prompt = buildAgentSystemPrompt('/home/user/project')
    expect(prompt).toContain('VersaRail AI')
    expect(prompt).toContain('Active Project Workspace: /home/user/project')
    expect(prompt).toContain('read_file')
    expect(prompt).toContain('write_file')
    expect(prompt).toContain('list_directory')
    expect(prompt).toContain('file_search')
    expect(prompt).toContain('execute_command')
  })

  it('builds system prompt gracefully when no workspace is opened', () => {
    const prompt = buildAgentSystemPrompt(null)
    expect(prompt).toContain('Active Project Workspace: None opened')
  })

  it('declares all 5 CRUD tool definitions for OpenAI wire format', () => {
    const toolNames = BUILTIN_TOOL_DEFINITIONS.map((t) => t.function.name)
    expect(toolNames).toContain('read_file')
    expect(toolNames).toContain('write_file')
    expect(toolNames).toContain('list_directory')
    expect(toolNames).toContain('file_search')
    expect(toolNames).toContain('execute_command')
  })

  it('extracts inline XML tool calls emitted by text-mode models', () => {
    const rawOutput = `Here is what I will do:
<tool_call>
{"name": "read_file", "arguments": {"path": "package.json"}}
</tool_call>
And I will also list the folder:
<tool_call>
{"name": "list_directory", "arguments": {"path": "src"}}
</tool_call>`

    const calls = extractInlineToolCalls(rawOutput)
    expect(calls.length).toBe(2)
    expect(calls[0].name).toBe('read_file')
    expect(calls[0].args).toEqual({ path: 'package.json' })
    expect(calls[1].name).toBe('list_directory')
    expect(calls[1].args).toEqual({ path: 'src' })
  })

  it('auto-approves low-risk read operations (fs:read) without user prompt blocking', async () => {
    const registry = ToolRegistry.getInstance()
    const result = await registry.executeTool(
      'list_directory',
      { path: '.' },
      { workspacePath: process.cwd() }
    )
    // If it did not auto-approve, it would time out waiting for an IPC dialog
    expect(result.success).toBe(true)
  })
})
