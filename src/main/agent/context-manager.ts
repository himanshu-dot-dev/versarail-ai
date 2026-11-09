/**
 * VersaRail AI Agent Harness - Context Manager & Privacy Controller
 * Manages token budgeting, context-window truncation, historical turn summarization,
 * provider data-sharing policies, and automated SQLite retention purging.
 */

import { SqliteDatabase } from '../storage/sqlite-database'
import { PrivacySettingsDTO } from '@shared/schemas/settings.schema'
import { DEFAULT_ALLOWED_PROVIDERS } from '@shared/schemas/provider.schema'

export interface ContextMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PrepareContextOptions {
  messages: ContextMessage[]
  maxTokens?: number
  reserveCompletionTokens?: number
  autoSummarize?: boolean
  systemPrompt?: string
}

export interface PrepareContextResult {
  messages: ContextMessage[]
  isTruncated: boolean
  originalTokens: number
  finalTokens: number
  summarizedTurnCount: number
}

export class ContextManager {
  private static instance: ContextManager | null = null

  private get db(): SqliteDatabase {
    return SqliteDatabase.getInstance()
  }

  private constructor() {}

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager()
    }
    return ContextManager.instance
  }

  public static resetInstance(): void {
    ContextManager.instance = null
  }

  /**
   * Estimates tokens for a given string based on standard 3.5 chars/token rule.
   */
  public estimateTokens(text: string): number {
    if (!text) return 0
    return Math.ceil(text.length / 3.5)
  }

  /**
   * Estimates aggregate tokens for a list of conversation messages.
   */
  public estimateMessagesTokens(messages: ContextMessage[]): number {
    return messages.reduce((total, msg) => total + this.estimateTokens(msg.content) + 4, 0)
  }

  /**
   * Prepares and budgets conversation messages to fit within the model's context ceiling.
   * Preserves the system prompt and the latest user turn.
   * Compacts or truncates older turns when budget is exceeded.
   */
  public prepareContext(options: PrepareContextOptions): PrepareContextResult {
    const {
      messages,
      maxTokens = 32_000,
      reserveCompletionTokens = 2_048,
      autoSummarize = true,
      systemPrompt
    } = options

    const targetBudget = Math.max(maxTokens - reserveCompletionTokens, 100)
    const originalTokens = this.estimateMessagesTokens(messages)

    if (originalTokens <= targetBudget) {
      return {
        messages: [...messages],
        isTruncated: false,
        originalTokens,
        finalTokens: originalTokens,
        summarizedTurnCount: 0
      }
    }

    // Context exceeds target budget — perform budgeting
    let systemMessage: ContextMessage | null = null

    // Extract or inject system prompt
    if (systemPrompt) {
      systemMessage = { role: 'system', content: systemPrompt }
    } else if (messages.length > 0 && messages[0].role === 'system') {
      systemMessage = messages[0]
    }

    const nonSystemMessages = messages.filter((m) => m.role !== 'system')
    if (nonSystemMessages.length === 0) {
      const finalMsgs = systemMessage ? [systemMessage] : []
      return {
        messages: finalMsgs,
        isTruncated: false,
        originalTokens,
        finalTokens: this.estimateMessagesTokens(finalMsgs),
        summarizedTurnCount: 0
      }
    }

    // Always preserve the latest turn (mandatory for user intent)
    const latestTurn = nonSystemMessages[nonSystemMessages.length - 1]
    const olderTurns = nonSystemMessages.slice(0, nonSystemMessages.length - 1)

    let currentTokens =
      (systemMessage ? this.estimateTokens(systemMessage.content) + 4 : 0) +
      this.estimateTokens(latestTurn.content) +
      4

    // Traverse older turns backwards to preserve as much recent history as possible
    const keptTurns: ContextMessage[] = []
    const discardedTurns: ContextMessage[] = []

    for (let i = olderTurns.length - 1; i >= 0; i--) {
      const turn = olderTurns[i]
      const turnTokens = this.estimateTokens(turn.content) + 4

      if (currentTokens + turnTokens <= targetBudget) {
        keptTurns.unshift(turn)
        currentTokens += turnTokens
      } else {
        discardedTurns.unshift(turn)
      }
    }

    // If discarded turns exist and autoSummarize is enabled, generate a concise summary pill
    let summaryMessage: ContextMessage | null = null
    if (discardedTurns.length > 0 && autoSummarize) {
      const topics: string[] = []
      for (const d of discardedTurns) {
        const snippet = d.content.slice(0, 60).replace(/\n/g, ' ').trim()
        if (snippet) {
          topics.push(`- ${d.role}: "${snippet}..."`)
        }
      }
      summaryMessage = {
        role: 'user',
        content: `[Context Window Compacted: ${discardedTurns.length} earlier turns summarized to fit model context ceiling]\n${topics.slice(0, 5).join('\n')}`
      }
    }

    // Assemble final message sequence
    const finalMessages: ContextMessage[] = []
    if (systemMessage) finalMessages.push(systemMessage)
    if (summaryMessage) finalMessages.push(summaryMessage)
    finalMessages.push(...keptTurns)
    finalMessages.push(latestTurn)

    const finalTokens = this.estimateMessagesTokens(finalMessages)

    return {
      messages: finalMessages,
      isTruncated: true,
      originalTokens,
      finalTokens,
      summarizedTurnCount: discardedTurns.length
    }
  }

  /**
   * Verifies if a given AI provider is permitted by active workspace privacy policies.
   */
  public isProviderAllowed(providerId: string, allowedProviders?: string[]): boolean {
    if (!allowedProviders || allowedProviders.length === 0) {
      return true
    }
    const lowerId = providerId.toLowerCase()
    return allowedProviders.some((p) => p.toLowerCase() === lowerId)
  }

  /**
   * Purges SQLite data older than the specified retention days.
   * If days is 0, completely purges conversation history.
   */
  public purgeOldData(retentionDays: number): { purgedConversations: number } {
    if (retentionDays === 0) {
      const stmt = this.db.prepare(`DELETE FROM conversations`)
      const res = stmt.run()
      return { purgedConversations: (res as any).changes || 0 }
    }

    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    ).toISOString()

    const stmt = this.db.prepare(`
      DELETE FROM conversations
      WHERE updated_at < ?
    `)
    const res = stmt.run(cutoffDate)

    return {
      purgedConversations: (res as any).changes || 0
    }
  }

  /**
   * Loads global privacy settings from SQLite settings table.
   */
  public getPrivacySettings(): PrivacySettingsDTO {
    const defaults: PrivacySettingsDTO = {
      allowedProviders: DEFAULT_ALLOWED_PROVIDERS,
      allowPublicCloud: true,
      autoRedactSecrets: true,
      auditRetentionDays: 30,
      contextWindowBudgetTokens: 32_000,
      autoSummarizeContext: true
    }

    try {
      const stmt = this.db.prepare(`
        SELECT value_json FROM settings WHERE key = 'privacy'
      `)
      const row = stmt.get() as { value_json: string } | undefined
      if (!row) {
        return defaults
      }

      const saved = JSON.parse(row.value_json)
      // Auto-healing migration: Ensure keyless free providers (pollinations, kilo)
      // are never locked out by an old 5-element legacy array saved by earlier builds
      const rawAllowed = Array.isArray(saved.allowedProviders) ? saved.allowedProviders : defaults.allowedProviders
      const isLegacyFiveOnly =
        rawAllowed.length === 5 &&
        ['gemini', 'groq', 'cerebras', 'openrouter', 'custom'].every((p) => rawAllowed.includes(p))

      const healedAllowed = isLegacyFiveOnly
        ? defaults.allowedProviders
        : rawAllowed

      return {
        ...defaults,
        ...saved,
        allowedProviders: healedAllowed
      }
    } catch {
      return defaults
    }
  }

  /**
   * Saves privacy settings to SQLite settings table.
   */
  public savePrivacySettings(settings: PrivacySettingsDTO): void {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value_json, updated_at)
      VALUES ('privacy', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `)
    stmt.run(JSON.stringify(settings), now)
  }

  /**
   * Calculates the safe context floor across a pool of candidate models.
   * Budgets context to 75% of the minimum candidate context window.
   */
  public calculatePoolContextFloor(
    candidates: Array<{ contextWindow: number }>,
    fallbackMax = 32_000
  ): number {
    if (!candidates || candidates.length === 0) return fallbackMax
    const minWindow = Math.min(...candidates.map((c) => c.contextWindow))
    return Math.max(Math.floor(minWindow * 0.75), 8_000)
  }

  /**
   * Compacts tool execution loop messages when tokens exceed the pool context floor.
   * Slashes old tool outputs to lightweight markers while preserving system prompt
   * and recent steps.
   */
  public compactToolLoopContext(
    messages: ContextMessage[],
    contextFloor: number
  ): ContextMessage[] {
    const currentTokens = this.estimateMessagesTokens(messages)
    if (currentTokens <= contextFloor || messages.length <= 3) {
      return messages
    }

    const systemMsg = messages[0].role === 'system' ? messages[0] : null
    const nonSystem = messages.filter((m) => m.role !== 'system')

    // Preserve the latest 2 turns intact
    const recentTurnsCount = 2
    const olderTurns = nonSystem.slice(0, Math.max(0, nonSystem.length - recentTurnsCount))
    const recentTurns = nonSystem.slice(Math.max(0, nonSystem.length - recentTurnsCount))

    // Step 1: Prune verbose tool outputs in older turns
    const prunedOlder = olderTurns.map((msg) => {
      if (msg.role === 'user' && msg.content.startsWith('[Tool Output for')) {
        const header = msg.content.split('\n')[0]
        return {
          role: msg.role,
          content: `${header}\n[Tool result content cleared for context economy]\n`
        }
      }
      return msg
    })

    const candidateResult = [
      ...(systemMsg ? [systemMsg] : []),
      ...prunedOlder,
      ...recentTurns
    ]

    if (this.estimateMessagesTokens(candidateResult) <= contextFloor) {
      return candidateResult
    }

    // Step 2: If still overflowing, summarize pruned older turns into a pinned milestone
    const summarizedSummary = `[Context Compaction Milestone: ${olderTurns.length} earlier tool turns summarized to fit ${contextFloor} token floor]`
    return [
      ...(systemMsg ? [systemMsg] : []),
      { role: 'system', content: summarizedSummary },
      ...recentTurns
    ]
  }
}
