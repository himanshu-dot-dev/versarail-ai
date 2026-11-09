import { ProviderId } from '@shared/domain/models'
import { ConversationStore } from '../storage/conversation-store'
import { FailoverEngine, FailoverEvent } from './failover-engine'
import { ContextManager } from './context-manager'
import { buildAgentSystemPrompt } from './system-prompt'
import { BUILTIN_TOOL_DEFINITIONS } from '../tools/builtin-tool-definitions'
import { ToolRegistry } from '../tools/tool-registry'
import { WorkspaceService } from '../workspace/workspace-service'
import { randomUUID } from 'crypto'
import { powerSaveBlocker } from 'electron'

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

    const contextManager = ContextManager.getInstance()
    const privacy = contextManager.getPrivacySettings()

    // Enforce privacy-allowed providers
    const effectiveAllowed = options.allowedProviders || (privacy.allowedProviders as ProviderId[])

    // Estimate initial prompt tokens to perform pre-flight candidate filtering
    let conv = this.convStore.getConversation(options.conversationId)
    const existingRawMessages = (conv?.messages || []).map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    }))
    const initialEstimatedTokens = contextManager.estimateMessagesTokens([
      ...existingRawMessages,
      { role: 'user', content: options.prompt }
    ])

    // 1. Resolve candidate models with pre-flight context floor and health ranking BEFORE writing to DB
    const candidates = this.failoverEngine.getCandidateModels({
      preferredProviderId: options.providerId,
      preferredModelId: options.modelId,
      estimatedPromptTokens: initialEstimatedTokens,
      allowedProviders: effectiveAllowed
    })

    if (candidates.length === 0) {
      this.activeRuns.delete(runId)
      const errMessage = `No valid candidates configured for provider "${options.providerId}". Please check API credentials and context limits in Providers settings.`
      options.onError({
        runId,
        message: errMessage,
        isFallbackEligible: false
      })
      throw new Error(errMessage)
    }

    // 2. Ensure conversation exists and persist user message only after candidates are verified
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

    // 3. Create agent run record in SQLite
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

    const budgeted = contextManager.prepareContext({
      messages: rawMessages,
      maxTokens: privacy.contextWindowBudgetTokens,
      autoSummarize: privacy.autoSummarizeContext
    })

    // Resolve active workspace either from prompt options or the native WorkspaceService
    const effectiveWorkspace = options.workspacePath || WorkspaceService.getInstance().getWorkspaceRoot()

    // Prepend or refresh Agent System Prompt with active workspace context
    const systemPrompt = buildAgentSystemPrompt(effectiveWorkspace)
    let contextMessages = [...budgeted.messages]
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

    let finalProvider = options.providerId
    let powerSaveBlockerId: number | null = null
    try {
      if (typeof powerSaveBlocker?.start === 'function') {
        powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
      }
    } catch {
      // In tests or headless environments, ignore
    }

    try {
      // 4. Stream response using Multi-Turn Agent Tool Execution Loop (up to 25 steps)
      const toolRegistry = ToolRegistry.getInstance()
      const MAX_TOOL_STEPS = 25
      let currentStep = 0
      let lastResponse = ''
      let accumulatedDisplayResponse = ''
      let activeModelId = options.modelId
      let taskCompleted = false

      while (currentStep < MAX_TOOL_STEPS) {
        currentStep++

        // 1. Dynamic candidate resolution on each step: respects latest cooldowns & LRU
        const currentTokens = contextManager.estimateMessagesTokens(contextMessages)
        const dynamicCandidates = this.failoverEngine.getCandidateModels({
          preferredProviderId: options.providerId,
          preferredModelId: activeModelId || options.modelId,
          estimatedPromptTokens: currentTokens,
          allowedProviders: effectiveAllowed
        })
        const candidatesForStep = dynamicCandidates.length > 0 ? dynamicCandidates : candidates

        // 2. Pool-aware context compaction: budget context against 75% of minimum candidate context window
        const poolFloor = contextManager.calculatePoolContextFloor(
          candidatesForStep,
          privacy.contextWindowBudgetTokens
        )
        if (currentTokens > poolFloor) {
          contextMessages = contextManager.compactToolLoopContext(contextMessages, poolFloor)
        }

        const streamResult = await this.failoverEngine.executeStreaming({
          runId,
          candidates: candidatesForStep,
          messages: contextMessages,
          tools: BUILTIN_TOOL_DEFINITIONS,
          signal: abortController.signal,
          preferredProviderId: options.providerId,
          preferredModelId: options.modelId,
          onToken: (chunk) => {
            if (chunk.delta) {
              options.onToken({
                runId,
                delta: chunk.delta,
                isComplete: false
              })
            }
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
          if (streamResult.fullResponse) {
            accumulatedDisplayResponse += streamResult.fullResponse
          }

          let destructiveOpsThisTurn = 0
          let safetyTriggered = false

          for (const call of streamResult.toolCalls) {
            let parsedArgs: Record<string, unknown> = {}
            try {
              parsedArgs =
                typeof call.arguments === 'string'
                  ? JSON.parse(call.arguments)
                  : (call.arguments as Record<string, unknown>) || {}
            } catch {
              parsedArgs = {}
            }

            // Completion Contract: task_complete tool signals task is finished
            if (call.name === 'task_complete') {
              const summary = (parsedArgs.summary as string) || 'Task completed successfully.'
              const taskDoneNotice = `\n\n> **Task Complete:** ${summary}\n`
              accumulatedDisplayResponse += taskDoneNotice
              options.onToken({
                runId,
                delta: taskDoneNotice,
                isComplete: false
              })
              taskCompleted = true
              break
            }

            const toolObj = toolRegistry.getTool(call.name)
            if (toolObj && ['fs:write', 'cmd:exec'].includes(toolObj.capability)) {
              destructiveOpsThisTurn++
            }

            if (destructiveOpsThisTurn > 3) {
              const safetyMsg = `\n\n> **Safety Intervention:** AI requested more than 3 destructive write/execute operations in a single turn. Execution paused for safety.\n`
              accumulatedDisplayResponse += safetyMsg
              options.onToken({
                runId,
                delta: safetyMsg,
                isComplete: false
              })
              safetyTriggered = true
              break
            }

            const actionMsg = `\n\n> **Action:** Executing tool \`${call.name}\`...\n`
            accumulatedDisplayResponse += actionMsg
            options.onToken({
              runId,
              delta: actionMsg,
              isComplete: false
            })

            const execResult = await toolRegistry.executeTool(call.name, parsedArgs, {
              runId,
              workspacePath: effectiveWorkspace,
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

            const outputMsg = `> **Output:** ${execResult.success ? 'Execution succeeded' : 'Execution failed'}\n\n`
            accumulatedDisplayResponse += outputMsg
            options.onToken({
              runId,
              delta: outputMsg,
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

          if (taskCompleted || safetyTriggered) {
            break
          }
          // Continue to next turn in tool execution loop
          continue
        }

        // No more tool calls; generation is complete
        accumulatedDisplayResponse += streamResult.fullResponse
        break
      }

      // 5. Persist assistant completion and update agent run
      const contentToSave = (accumulatedDisplayResponse || lastResponse).trim() || 'Task completed.'
      this.convStore.addMessage({
        conversationId: options.conversationId,
        role: 'assistant',
        content: contentToSave,
        modelId: activeModelId
      })

      this.convStore.completeRun(runId, 'completed', finalProvider)

      options.onToken({
        runId,
        delta: '',
        isComplete: true
      })

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
      if (powerSaveBlockerId !== null && typeof powerSaveBlocker?.stop === 'function') {
        try {
          powerSaveBlocker.stop(powerSaveBlockerId)
        } catch {
          // Ignore
        }
      }
      this.activeRuns.delete(runId)
    }
  }
}
