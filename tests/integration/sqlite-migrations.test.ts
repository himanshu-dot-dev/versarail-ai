import { describe, it, expect, afterEach } from 'vitest'
import { SqliteDatabase } from '../../src/main/storage/sqlite-database'
import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync, existsSync } from 'fs'

describe('SqliteDatabase & Migrations', () => {
  const testDbPath = join(tmpdir(), `test-harness-${Date.now()}.db`)
  let db: SqliteDatabase | null = null

  afterEach(() => {
    if (db) {
      db.close()
      db = null
    }
    // Clean up temporary database files
    for (const ext of ['', '-wal', '-shm']) {
      const file = `${testDbPath}${ext}`
      if (existsSync(file)) {
        try {
          unlinkSync(file)
        } catch {
          // ignore cleanup errors on open locks
        }
      }
    }
  })

  it('initializes database, enables WAL mode, and applies migrations', () => {
    db = SqliteDatabase.createIsolated(testDbPath)

    // Verify migrations table has version 1
    const stmt = db.prepare('SELECT version, name FROM schema_migrations WHERE version = 1')
    const migration = stmt.get() as { version: number; name: string }

    expect(migration).toBeDefined()
    expect(migration.version).toBe(1)
    expect(migration.name).toBe('001_initial_schema')
  })

  it('inserts and retrieves conversation and cascaded messages', () => {
    db = SqliteDatabase.createIsolated(testDbPath)

    // Insert conversation
    const insertConv = db.prepare(`
      INSERT INTO conversations (id, title, selected_model, workspace_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertConv.run('conv-1', 'Test Conversation', 'gemini-2.5-flash', '/workspace', new Date().toISOString(), new Date().toISOString())

    // Insert message
    const insertMsg = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, prompt_tokens, completion_tokens, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    insertMsg.run('msg-1', 'conv-1', 'user', 'Hello AI Agent', 10, 0, new Date().toISOString())

    // Query messages
    const query = db.prepare('SELECT * FROM messages WHERE conversation_id = ?')
    const messages = query.all('conv-1') as { id: string; content: string; role: string }[]

    expect(messages.length).toBe(1)
    expect(messages[0].content).toBe('Hello AI Agent')
    expect(messages[0].role).toBe('user')

    // Test cascading delete
    const deleteConv = db.prepare('DELETE FROM conversations WHERE id = ?')
    deleteConv.run('conv-1')

    const orphaned = db.prepare('SELECT * FROM messages WHERE conversation_id = ?').all('conv-1')
    expect(orphaned.length).toBe(0)
  })
})

