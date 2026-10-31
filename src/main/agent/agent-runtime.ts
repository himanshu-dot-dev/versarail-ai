import { ProviderId } from '@shared/domain/models'
import { ConversationStore } from '../storage/conversation-store'
import { FailoverEngine, FailoverEvent } from './failover-engine'
import { randomUUID } from 'crypto'

export interface AgentRunOptions {
  conversationId: string
  prompt: string
  modelId: string
  providerId: ProviderId
  workspacePath?: string | null
  allowedProviders?: ProviderId[]
  onToken: (chunk: { runId: string; delta: string; isComplete: boolean }) => void
  onFailover?: (event: FailoverEvent) => void
  onError: (err: { runId: string; message: string; isFallbackEligible: boolean }) => void
}

export class AgentRuntime {
  private static instance: AgentRuntime | null = null
  private convStore: ConversationStore
  private failoverEngine: FailoverEngine
  private activeRuns: Map<string, AbortController> = new Map()

  private constructor() {
    this.convStore = ConversationStore.getInstance()
    this.failoverEngine = FailoverEngine.getInstance()
  }

  public static getInstance(): AgentRuntime {
    if (!AgentRuntime.instance) {
      AgentRuntime.instance = new AgentRuntime()
    }
    return AgentRuntime.instance
  }

  public cancelRun(runId: string): boolean {
    const controller = this.activeRuns.get(runId)
    if (controller) {
      controller.abort()
      this.activeRuns.delete(runId)
      this.convStore.completeRun(runId, 'cancelled', undefined, 'Run cancelled by user')
      return true
    }
    return false
  }

  public isRunActive(runId: string): boolean {
    return this.activeRuns.has(runId)
  }

  public async executePrompt(options: AgentRunOptions): Promise<{ runId: string; fullResponse: string }> {
    const runId = randomUUID()
    const abortController = new AbortController()
    this.activeRuns.set(runId, abortController)

    // 1. Ensure conversation exists and persist user message
    let conv = this.convStore.getConversation(options.conversationId)
    if (!conv) {
      this.convStore.createConversation({
        id: options.conversationId,
        title: options.prompt.slice(0, 50).trim() || 'New Conversation',
        selectedModel: options.modelId,
        workspacePath: options.workspacePath
      })
    }

    this.convStore.addMessage({
      conversationId: options.conversationId,
      role: 'user',
      content: options.prompt
    })

    // 2. Create agent run record in SQLite
    this.convStore.createRun({
      id: runId,
      conversationId: options.conversationId,
      initialProvider: options.providerId
    })

    // Build conversation context messages from SQLite
    conv = this.convStore.getConversation(options.conversationId)
    const contextMessages = (conv?.messages || []).map((m) => ({
      role: m.role,
      content: m.content
    }))

    // Estimate prompt tokens for pre-flight context window check
    const totalChars = contextMessages.reduce((sum, m) => sum + m.content.length, 0)
    const estimatedPromptTokens = Math.ceil(totalChars / 3.5)

    let finalProvider = options.providerId

    try {
      // 3. Resolve candidate models with pre-flight context floor and health ranking
      const candidates = this.failoverEngine.getCandidateModels({
        preferredProviderId: options.providerId,
        preferredModelId: options.modelId,
        estimatedPromptTokens,
        allowedProviders: options.allowedProviders
      })

      if (candidates.length === 0) {
        throw new Error(
          `No valid candidates configured for provider "${options.providerId}". Please check API credentials and context limits in Providers settings.`
        )
      }

      // 4. Stream response using Failover Engine with Dead-Turn Pre-First-Byte Recovery
      const streamResult = await this.failoverEngine.executeStreaming({
        runId,
        candidates,
        messages: contextMessages,
        signal: abortController.signal,
        onToken: (chunk) => {
          options.onToken({
            runId,
            delta: chunk.delta,
            isComplete: chunk.isComplete
          })
        },
        onFailover: (event) => {
          options.onFailover?.(event)
        }
      })

      finalProvider = streamResult.finalProviderId

      // 5. Persist assistant completion and update agent run
      this.convStore.addMessage({
        conversationId: options.conversationId,
        role: 'assistant',
        content: streamResult.fullResponse,
        modelId: streamResult.finalModelId
      })

      this.convStore.completeRun(runId, 'completed', finalProvider)

      return {
        runId,
        fullResponse: streamResult.fullResponse
      }
    } catch (err: any) {
      const isCancelled = abortController.signal.aborted || err.message?.includes('cancelled')
      const status = isCancelled ? 'cancelled' : 'failed'

      this.convStore.completeRun(runId, status, finalProvider, err.message)

      options.onError({
        runId,
        message: err.message || 'Stream generation failed',
        isFallbackEligible: !isCancelled
      })

      throw err
    } finally {
      this.activeRuns.delete(runId)
    }
  }
}
