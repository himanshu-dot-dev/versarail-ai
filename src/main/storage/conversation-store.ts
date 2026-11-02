import { SqliteDatabase } from './sqlite-database'
import { randomUUID } from 'crypto'

export interface ConversationRecord {
  id: string
  title: string
  selectedModel: string
  workspacePath?: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageRecord {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant'
  content: string
  modelId?: string | null
  promptTokens?: number
  completionTokens?: number
  createdAt: string
}

export interface AgentRunRecord {
  id: string
  conversationId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  initialProvider: string
  finalProvider?: string | null
  failoverCount: number
  errorMessage?: string | null
  createdAt: string
  completedAt?: string | null
}

export class ConversationStore {
  private static instance: ConversationStore | null = null
  private get db(): SqliteDatabase {
    return SqliteDatabase.getInstance()
  }

  private constructor() {}

  public static getInstance(): ConversationStore {
    if (!ConversationStore.instance) {
      ConversationStore.instance = new ConversationStore()
    }
    return ConversationStore.instance
  }

  public static resetInstance(): void {
    ConversationStore.instance = null
  }

  public createConversation(params: {
    id?: string
    title: string
    selectedModel: string
    workspacePath?: string | null
  }): ConversationRecord {
    const id = params.id || randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, selected_model, workspace_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, params.title, params.selectedModel, params.workspacePath || null, now, now)

    return {
      id,
      title: params.title,
      selectedModel: params.selectedModel,
      workspacePath: params.workspacePath,
      createdAt: now,
      updatedAt: now
    }
  }

  public listConversations(): ConversationRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, title, selected_model, workspace_path, created_at, updated_at
      FROM conversations
      ORDER BY updated_at DESC
    `)

    const rows = stmt.all() as Array<{
      id: string
      title: string
      selected_model: string
      workspace_path: string | null
      created_at: string
      updated_at: string
    }>

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      selectedModel: r.selected_model,
      workspacePath: r.workspace_path,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  public getConversation(id: string): { conversation: ConversationRecord; messages: MessageRecord[] } | null {
    const convStmt = this.db.prepare(`
      SELECT id, title, selected_model, workspace_path, created_at, updated_at
      FROM conversations
      WHERE id = ?
    `)

    const conv = convStmt.get(id) as {
      id: string
      title: string
      selected_model: string
      workspace_path: string | null
      created_at: string
      updated_at: string
    } | undefined

    if (!conv) return null

    const msgStmt = this.db.prepare(`
      SELECT id, conversation_id, role, content, model_id, prompt_tokens, completion_tokens, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `)

    const msgRows = msgStmt.all(id) as Array<{
      id: string
      conversation_id: string
      role: 'system' | 'user' | 'assistant'
      content: string
      model_id: string | null
      prompt_tokens: number
      completion_tokens: number
      created_at: string
    }>

    return {
      conversation: {
        id: conv.id,
        title: conv.title,
        selectedModel: conv.selected_model,
        workspacePath: conv.workspace_path,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at
      },
      messages: msgRows.map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role,
        content: m.content,
        modelId: m.model_id,
        promptTokens: m.prompt_tokens,
        completionTokens: m.completion_tokens,
        createdAt: m.created_at
      }))
    }
  }

  public deleteConversation(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?')
    stmt.run(id)
    return true
  }

  public addMessage(params: {
    id?: string
    conversationId: string
    role: 'system' | 'user' | 'assistant'
    content: string
    modelId?: string | null
    promptTokens?: number
    completionTokens?: number
  }): MessageRecord {
    const id = params.id || randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, model_id, prompt_tokens, completion_tokens, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      params.conversationId,
      params.role,
      params.content,
      params.modelId || null,
      params.promptTokens || 0,
      params.completionTokens || 0,
      now
    )

    // Update conversation timestamp
    const touchStmt = this.db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
    touchStmt.run(now, params.conversationId)

    return {
      id,
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      modelId: params.modelId,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      createdAt: now
    }
  }

  public createRun(params: {
    id?: string
    conversationId: string
    initialProvider: string
  }): AgentRunRecord {
    const id = params.id || randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO agent_runs (id, conversation_id, status, initial_provider, failover_count, created_at)
      VALUES (?, ?, 'running', ?, 0, ?)
    `)

    stmt.run(id, params.conversationId, params.initialProvider, now)

    return {
      id,
      conversationId: params.conversationId,
      status: 'running',
      initialProvider: params.initialProvider,
      failoverCount: 0,
      createdAt: now
    }
  }

  public completeRun(
    runId: string,
    status: 'completed' | 'failed' | 'cancelled',
    finalProvider?: string,
    errorMessage?: string
  ): void {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      UPDATE agent_runs
      SET status = ?, final_provider = ?, error_message = ?, completed_at = ?
      WHERE id = ?
    `)
    stmt.run(status, finalProvider || null, errorMessage || null, now, runId)
  }

  public recordToolCallStart(params: {
    id?: string
    runId: string
    toolName: string
    argumentsJson: string
  }): string {
    const id = params.id || randomUUID()
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      INSERT INTO tool_calls (id, run_id, tool_name, arguments_json, status, created_at)
      VALUES (?, ?, ?, ?, 'running', ?)
    `)
    stmt.run(id, params.runId, params.toolName, params.argumentsJson, now)
    return id
  }

  public completeToolCall(params: {
    id: string
    status: 'success' | 'failed'
    resultJson?: string
    executionDurationMs: number
  }): void {
    const stmt = this.db.prepare(`
      UPDATE tool_calls
      SET status = ?, result_json = ?, execution_duration_ms = ?
      WHERE id = ?
    `)
    stmt.run(params.status, params.resultJson || null, params.executionDurationMs, params.id)
  }

  public getToolCallsForRun(runId: string): Array<{
    id: string
    runId: string
    toolName: string
    argumentsJson: string
    resultJson: string | null
    status: string
    executionDurationMs: number | null
    createdAt: string
  }> {
    const stmt = this.db.prepare(`
      SELECT id, run_id, tool_name, arguments_json, result_json, status, execution_duration_ms, created_at
      FROM tool_calls
      WHERE run_id = ?
      ORDER BY created_at ASC
    `)
    const rows = stmt.all(runId) as Array<{
      id: string
      run_id: string
      tool_name: string
      arguments_json: string
      result_json: string | null
      status: string
      execution_duration_ms: number | null
      created_at: string
    }>
    return rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      toolName: r.tool_name,
      argumentsJson: r.arguments_json,
      resultJson: r.result_json,
      status: r.status,
      executionDurationMs: r.execution_duration_ms,
      createdAt: r.created_at
    }))
  }
}

