import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConversationStore } from '../../src/main/storage/conversation-store'
import { SqliteDatabase } from '../../src/main/storage/sqlite-database'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('ConversationStore SQLite Integration', () => {
  let tempDir: string
  let dbPath: string
  let store: ConversationStore

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-conv-test-'))
    dbPath = path.join(tempDir, 'test-conv.db')

    // Reset singletons for test isolation
    // @ts-expect-error Reset singleton for testing
    SqliteDatabase.instance = null
    // @ts-expect-error Reset singleton for testing
    ConversationStore.instance = null

    const db = SqliteDatabase.getInstance(dbPath)
    db.runMigrations()
    store = ConversationStore.getInstance()
  })

  afterEach(() => {
    try {
      const db = SqliteDatabase.getInstance()
      db.close()
    } catch {
      // Ignore
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('creates, lists, and retrieves conversations with cascaded messages', () => {
    // 1. Create conversation
    const conv = store.createConversation({
      id: 'conv-test-1',
      title: 'Refactor Authentication',
      selectedModel: 'gemini-2.5-flash',
      workspacePath: 'C:\\test\\workspace'
    })

    expect(conv.id).toBe('conv-test-1')
    expect(conv.title).toBe('Refactor Authentication')

    // 2. Add user message
    const msg1 = store.addMessage({
      conversationId: 'conv-test-1',
      role: 'user',
      content: 'Please refactor auth.ts to add salt rotation.'
    })
    expect(msg1.content).toContain('salt rotation')

    // 3. Add assistant message
    const msg2 = store.addMessage({
      conversationId: 'conv-test-1',
      role: 'assistant',
      content: 'Here is the proposed refactor using PBKDF2.',
      modelId: 'gemini-2.5-flash',
      promptTokens: 42,
      completionTokens: 128
    })
    expect(msg2.promptTokens).toBe(42)

    // 4. Retrieve conversation and verify messages
    const retrieved = store.getConversation('conv-test-1')
    expect(retrieved).not.toBeNull()
    expect(retrieved?.conversation.title).toBe('Refactor Authentication')
    expect(retrieved?.messages.length).toBe(2)
    expect(retrieved?.messages[0].role).toBe('user')
    expect(retrieved?.messages[1].role).toBe('assistant')

    // 5. List conversations
    const list = store.listConversations()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe('conv-test-1')

    // 6. Delete conversation
    store.deleteConversation('conv-test-1')
    expect(store.getConversation('conv-test-1')).toBeNull()
    expect(store.listConversations().length).toBe(0)
  })

  it('renames a conversation successfully and persists new title to database', () => {
    store.createConversation({
      id: 'conv-rename-1',
      title: 'Old Title',
      selectedModel: 'openai/gpt-oss-120b'
    })

    expect(store.getConversation('conv-rename-1')?.conversation.title).toBe('Old Title')

    const success = store.renameConversation('conv-rename-1', 'New Refactored Title')
    expect(success).toBe(true)

    const updated = store.getConversation('conv-rename-1')
    expect(updated?.conversation.title).toBe('New Refactored Title')

    const list = store.listConversations()
    expect(list.find((c) => c.id === 'conv-rename-1')?.title).toBe('New Refactored Title')
  })

  it('records and completes agent execution runs', () => {
    store.createConversation({
      id: 'conv-runs',
      title: 'Run Execution Test',
      selectedModel: 'llama-3.3-70b'
    })

    const run = store.createRun({
      id: 'run-001',
      conversationId: 'conv-runs',
      initialProvider: 'groq'
    })

    expect(run.status).toBe('running')
    expect(run.initialProvider).toBe('groq')

    store.completeRun('run-001', 'completed', 'groq')

    // Verify database record
    const db = SqliteDatabase.getInstance()
    const stmt = db.prepare('SELECT * FROM agent_runs WHERE id = ?')
    const record = stmt.get('run-001') as { status: string; completed_at: string } | undefined
    expect(record?.status).toBe('completed')
    expect(record?.completed_at).toBeDefined()
  })
})

