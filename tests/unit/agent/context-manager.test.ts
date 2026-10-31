/**
 * VersaRail AI Agent Harness - Unit Test Suite
 * Milestone 10: Context Management, Token Budgeting & Privacy Controls
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ContextManager, ContextMessage } from '../../../src/main/agent/context-manager'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import { ConversationStore } from '../../../src/main/storage/conversation-store'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('ContextManager - Token Budgeting, Summarization & Privacy Gating', () => {
  let tempDir: string
  let dbPath: string
  let contextManager: ContextManager
  let convStore: ConversationStore

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-ctx-test-'))
    dbPath = path.join(tempDir, 'test-ctx.db')

    SqliteDatabase.resetInstance()
    ContextManager.resetInstance()
    ConversationStore.resetInstance()

    SqliteDatabase.getInstance(dbPath)

    contextManager = ContextManager.getInstance()
    convStore = ConversationStore.getInstance()
  })

  afterEach(() => {
    ContextManager.resetInstance()
    ConversationStore.resetInstance()
    SqliteDatabase.resetInstance()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('estimates tokens based on standard 3.5 character ratio', () => {
    expect(contextManager.estimateTokens('')).toBe(0)
    // 35 characters -> 10 tokens
    expect(contextManager.estimateTokens('12345678901234567890123456789012345')).toBe(10)
  })

  it('preserves complete message history when within token budget', () => {
    const messages: ContextMessage[] = [
      { role: 'system', content: 'You are an AI assistant.' },
      { role: 'user', content: 'Hello there!' },
      { role: 'assistant', content: 'Hello! How can I help?' },
      { role: 'user', content: 'Please review this code.' }
    ]

    const result = contextManager.prepareContext({
      messages,
      maxTokens: 4096,
      reserveCompletionTokens: 1024
    })

    expect(result.isTruncated).toBe(false)
    expect(result.messages.length).toBe(4)
    expect(result.messages[0].content).toBe('You are an AI assistant.')
    expect(result.messages[3].content).toBe('Please review this code.')
  })

  it('compacts and auto-summarizes earlier turns when budget is exceeded', () => {
    const longContent = 'A'.repeat(500) // ~143 tokens each
    const messages: ContextMessage[] = [
      { role: 'system', content: 'System instruction: be helpful.' },
      { role: 'user', content: `Turn 1: ${longContent}` },
      { role: 'assistant', content: `Turn 2: ${longContent}` },
      { role: 'user', content: `Turn 3: ${longContent}` },
      { role: 'assistant', content: `Turn 4: ${longContent}` },
      { role: 'user', content: `Latest user turn: ${longContent}` }
    ]

    // Set tight budget: 1500 tokens max, reserve 1000 -> targetBudget 500 tokens
    const result = contextManager.prepareContext({
      messages,
      maxTokens: 1500,
      reserveCompletionTokens: 1000,
      autoSummarize: true
    })

    expect(result.isTruncated).toBe(true)
    expect(result.summarizedTurnCount).toBeGreaterThan(0)
    expect(result.finalTokens).toBeLessThan(result.originalTokens)

    // The system prompt must always be preserved
    expect(result.messages[0].role).toBe('system')
    expect(result.messages[0].content).toContain('System instruction: be helpful.')

    // The latest user turn must always be preserved
    const lastMsg = result.messages[result.messages.length - 1]
    expect(lastMsg.role).toBe('user')
    expect(lastMsg.content).toContain('Latest user turn')

    // A summary pill should be present in the messages
    const hasSummary = result.messages.some((m) =>
      m.content.includes('Context Window Compacted')
    )
    expect(hasSummary).toBe(true)
  })

  it('enforces workspace provider privacy gating', () => {
    const policy = ['gemini', 'groq']

    expect(contextManager.isProviderAllowed('gemini', policy)).toBe(true)
    expect(contextManager.isProviderAllowed('groq', policy)).toBe(true)
    expect(contextManager.isProviderAllowed('cerebras', policy)).toBe(false)
    expect(contextManager.isProviderAllowed('openrouter', policy)).toBe(false)

    // Case-insensitive check
    expect(contextManager.isProviderAllowed('GROQ', policy)).toBe(true)

    // Unrestricted policy allows all
    expect(contextManager.isProviderAllowed('cerebras', undefined)).toBe(true)
    expect(contextManager.isProviderAllowed('cerebras', [])).toBe(true)
  })

  it('purges retention data from SQLite cleanly', () => {
    // Create dummy conversations
    const conv1 = convStore.createConversation({ title: 'Old Conv', selectedModel: 'gemini' })
    const conv2 = convStore.createConversation({ title: 'New Conv', selectedModel: 'groq' })

    convStore.addMessage({ conversationId: conv1.id, role: 'user', content: 'msg1' })
    convStore.addMessage({ conversationId: conv2.id, role: 'user', content: 'msg2' })

    // Purge everything with retentionDays: 0
    const purgeResult = contextManager.purgeOldData(0)
    expect(purgeResult.purgedConversations).toBeGreaterThanOrEqual(2)

    // Verify conversations are removed
    const list = convStore.listConversations()
    expect(list.length).toBe(0)
  })

  it('persists and retrieves privacy settings from SQLite', () => {
    const initialSettings = contextManager.getPrivacySettings()
    expect(initialSettings.auditRetentionDays).toBe(30)

    contextManager.savePrivacySettings({
      allowedProviders: ['groq'],
      allowPublicCloud: false,
      autoRedactSecrets: true,
      auditRetentionDays: 7,
      contextWindowBudgetTokens: 16_000,
      autoSummarizeContext: false
    })

    const updated = contextManager.getPrivacySettings()
    expect(updated.allowedProviders).toEqual(['groq'])
    expect(updated.allowPublicCloud).toBe(false)
    expect(updated.auditRetentionDays).toBe(7)
    expect(updated.contextWindowBudgetTokens).toBe(16_000)
    expect(updated.autoSummarizeContext).toBe(false)
  })
})
