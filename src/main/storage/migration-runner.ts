import { DatabaseSync } from 'node:sqlite'

interface Migration {
  version: number
  name: string
  up: string
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        selected_model TEXT NOT NULL,
        workspace_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model_id TEXT,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_runs (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        initial_provider TEXT NOT NULL,
        final_provider TEXT,
        failover_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS tool_calls (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
        tool_name TEXT NOT NULL,
        arguments_json TEXT NOT NULL,
        result_json TEXT,
        status TEXT NOT NULL,
        execution_duration_ms INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permission_decisions (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        capability TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        decision TEXT NOT NULL,
        remember_scope TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS file_changes_journal (
        id TEXT PRIMARY KEY,
        run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
        workspace_path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        baseline_sha256 TEXT NOT NULL,
        diff_patch TEXT NOT NULL,
        status TEXT NOT NULL,
        applied_at TEXT
      );

      CREATE TABLE IF NOT EXISTS provider_metadata (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        label TEXT NOT NULL,
        custom_endpoint TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        health_status TEXT NOT NULL DEFAULT 'healthy',
        cooldown_until INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_agent_runs_conversation ON agent_runs(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_tool_calls_run ON tool_calls(run_id);
      CREATE INDEX IF NOT EXISTS idx_file_changes_workspace ON file_changes_journal(workspace_path);
    `
  },
  {
    version: 2,
    name: '002_provider_health',
    up: `
      CREATE TABLE IF NOT EXISTS provider_health (
        key_id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        model_id TEXT,
        status TEXT NOT NULL DEFAULT 'ok',
        strikes INTEGER NOT NULL DEFAULT 0,
        cooldown_until INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        last_used_at INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_provider_health_status ON provider_health(status);
      CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health(provider_id);
    `
  }
]

export class MigrationRunner {
  private db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.db = db
  }

  public migrate(): void {
    // 1. Ensure schema_migrations table exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `)

    // 2. Fetch applied migrations
    const stmt = this.db.prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
    const appliedRows = stmt.all() as { version: number }[]
    const appliedVersions = new Set(appliedRows.map((r) => r.version))

    // 3. Run pending migrations in order
    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`[Database Migration] Applying migration ${migration.version}: ${migration.name}`)
        this.db.exec(migration.up)

        const insertStmt = this.db.prepare(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
        )
        insertStmt.run(migration.version, migration.name, new Date().toISOString())
      }
    }
  }
}

