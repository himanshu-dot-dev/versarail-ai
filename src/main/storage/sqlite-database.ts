import { DatabaseSync, StatementSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'path'
import { MigrationRunner } from './migration-runner'

export class SqliteDatabase {
  private static instance: SqliteDatabase | null = null
  private db: DatabaseSync
  private dbPath: string

  private constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath
    } else {
      const userDataPath = app.getPath('userData')
      this.dbPath = join(userDataPath, 'harness.db')
    }

    this.db = new DatabaseSync(this.dbPath)
    this.configurePragmas()
    this.runMigrations()
  }

  public static getInstance(customPath?: string): SqliteDatabase {
    if (!this.instance) {
      this.instance = new SqliteDatabase(customPath)
    }
    return this.instance
  }

  public static resetInstance(): void {
    if (this.instance) {
      try {
        this.instance.close()
      } catch {
        // ignore
      }
      this.instance = null
    }
  }

  /**
   * Directly creates an isolated instance for tests (e.g. in-memory or temp file).
   */
  public static createIsolated(path: string): SqliteDatabase {
    return new SqliteDatabase(path)
  }

  private configurePragmas(): void {
    // Enable WAL (Write-Ahead Logging) for crash durability & concurrency
    this.db.exec('PRAGMA journal_mode = WAL;')
    // Enforce foreign key constraints
    this.db.exec('PRAGMA foreign_keys = ON;')
    // Synchronous = NORMAL balances durability and maximum write throughput
    this.db.exec('PRAGMA synchronous = NORMAL;')
  }

  private runMigrations(): void {
    const runner = new MigrationRunner(this.db)
    runner.migrate()
  }

  public exec(sql: string): void {
    this.db.exec(sql)
  }

  public prepare(sql: string): StatementSync {
    return this.db.prepare(sql)
  }

  public close(): void {
    this.db.close()
    if (SqliteDatabase.instance === this) {
      SqliteDatabase.instance = null
    }
  }

  public getPath(): string {
    return this.dbPath
  }
}

