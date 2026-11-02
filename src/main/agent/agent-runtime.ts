import { ProviderId } from '@shared/domain/models'
import { ConversationStore } from '../storage/conversation-store'
import { FailoverEngine, FailoverEvent } from './failover-engine'
import { ContextManager } from './context-manager'
import { buildAgentSystemPrompt } from './system-prompt'
import { BUILTIN_TOOL_DEFINITIONS } from '../tools/builtin-tool-definitions'
import { ToolRegistry } from '../tools/tool-registry'
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

  public static resetInstance(): void {
    AgentRuntime.instance = null
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

    // Build conversation context messages from SQLite and budget via ContextManager
    conv = this.convStore.getConversation(options.conversationId)
    const rawMessages = (conv?.messages || []).map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    }))

    const contextManager = ContextManager.getInstance()
    const privacy = contextManager.getPrivacySettings()

    // Enforce privacy-allowed providers
    const effectiveAllowed = options.allowedProviders || (privacy.allowedProviders as ProviderId[])

    const budgeted = contextManager.prepareContext({
      messages: rawMessages,
      maxTokens: privacy.contextWindowBudgetTokens,
      autoSummarize: privacy.autoSummarizeContext
    })

    // Prepend or refresh Agent System Prompt with active workspace context
    const systemPrompt = buildAgentSystemPrompt(options.workspacePath)
    const contextMessages = [...budgeted.messages]
    if (contextMessages.length === 0 || contextMessages[0].role !== 'system') {
      contextMessages.unshift({
        role: 'system',
        content: systemPrompt
      })
    } else {
      contextMessages[0] = {
        role: 'system',
        content: systemPrompt
      }
    }

    const estimatedPromptTokens = budgeted.finalTokens

    let finalProvider = options.providerId

    try {
      // 3. Resolve candidate models with pre-flight context floor and health ranking
      const candidates = this.failoverEngine.getCandidateModels({
        preferredProviderId: options.providerId,
        preferredModelId: options.modelId,
        estimatedPromptTokens,
        allowedProviders: effectiveAllowed
      })

      if (candidates.length === 0) {
        throw new Error(
          `No valid candidates configured for provider "${options.providerId}". Please check API credentials and context limits in Providers settings.`
        )
      }

      // 4. Stream response using Multi-Turn Agent Tool Execution Loop
      const toolRegistry = ToolRegistry.getInstance()
      const MAX_TOOL_STEPS = 5
      let currentStep = 0
      let lastResponse = ''
      let activeModelId = options.modelId

      while (currentStep < MAX_TOOL_STEPS) {
        currentStep++

        const streamResult = await this.failoverEngine.executeStreaming({
          runId,
          candidates,
          messages: contextMessages,
          tools: BUILTIN_TOOL_DEFINITIONS,
          signal: abortController.signal,
          preferredProviderId: options.providerId,
          preferredModelId: options.modelId,
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
        activeModelId = streamResult.finalModelId
        lastResponse = streamResult.fullResponse

        // Check if model emitted any tool calls to execute
        if (streamResult.toolCalls && streamResult.toolCalls.length > 0) {
          let destructiveOpsThisTurn = 0

          for (const call of streamResult.toolCalls) {
            const toolObj = toolRegistry.getTool(call.name)
            if (toolObj && ['fs:write', 'cmd:exec'].includes(toolObj.capability)) {
              destructiveOpsThisTurn++
            }

            if (destructiveOpsThisTurn > 3) {
              options.onToken({
                runId,
                delta: `\n\n> ⚠️ **Safety Intervention:** AI requested more than 3 destructive write/execute operations in a single turn. Execution paused for safety.\n`,
                isComplete: false
              })
              break
            }

            let parsedArgs: Record<string, unknown> = {}
            try {
              parsedArgs =
                typeof call.arguments === 'string'
                  ? JSON.parse(call.arguments)
                  : (call.arguments as Record<string, unknown>) || {}
            } catch {
              parsedArgs = {}
            }

            options.onToken({
              runId,
              delta: `\n\n> ⚙️ **Action:** Executing tool \`${call.name}\`...\n`,
              isComplete: false
            })

            const execResult = await toolRegistry.executeTool(call.name, parsedArgs, {
              runId,
              workspacePath: options.workspacePath,
              signal: abortController.signal
            })

            let resultFormatted = execResult.success
              ? typeof execResult.result === 'string'
                ? execResult.result
                : JSON.stringify(execResult.result, null, 2)
              : `Error: ${execResult.error}`

            // Truncate tool output if it exceeds context limit (8,000 characters)
            const MAX_TOOL_RESULT_CHARS = 8000
            if (resultFormatted.length > MAX_TOOL_RESULT_CHARS) {
              resultFormatted =
                resultFormatted.slice(0, MAX_TOOL_RESULT_CHARS) +
                '\n\n[OUTPUT TRUNCATED: Exceeded 8,000 character safety limit for conversation context]'
            }

            const statusIcon = execResult.success ? '✅' : '❌'
            options.onToken({
              runId,
              delta: `> ${statusIcon} **Output:** ${execResult.success ? 'Execution succeeded' : 'Execution failed'}\n\n`,
              isComplete: false
            })

            contextMessages.push({
              role: 'assistant',
              content: streamResult.fullResponse || `[Called tool ${call.name}]`
            })

            contextMessages.push({
              role: 'user',
              content: `[Tool Output for ${call.name}]:\n${resultFormatted}\n\nPlease proceed to inspect this output and continue answering the user's request.`
            })
          }
          // Continue to next turn in tool execution loop
          continue
        }

        // No more tool calls; generation is complete
        break
      }

      // 5. Persist assistant completion and update agent run
      this.convStore.addMessage({
        conversationId: options.conversationId,
        role: 'assistant',
        content: lastResponse,
        modelId: activeModelId
      })

      this.convStore.completeRun(runId, 'completed', finalProvider)

      return {
        runId,
        fullResponse: lastResponse
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
