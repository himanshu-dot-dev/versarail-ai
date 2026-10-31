import React, { useState, useEffect, useRef } from 'react'
import { useUiStore } from '../../app/useUiStore'
import WelcomeHero from '../workspace/WelcomeHero'
import ExecutionTimeline from './ExecutionTimeline'
import ToolActivityStream from './ToolActivityStream'
import FileChangeBanner from './FileChangeBanner'
import PromptComposer from './PromptComposer'
import Icon from '../../components/common/Icon'

interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  model?: string
  isStreaming?: boolean
  error?: string
}

export const ChatView: React.FC = () => {
  const { hasActiveRun, setHasActiveRun, connectedModel, workspace, setActiveView } = useUiStore()
  const [conversationId, setConversationId] = useState('conv-default')
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [failoverNotice, setFailoverNotice] = useState<{
    from: string
    to: string
    reason: string
    isSilent: boolean
    resetEta?: string | null
  } | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'msg-1',
      role: 'user',
      text: 'Analyze this project, identify the main issues, and refactor the authentication module without changing the public API.',
      time: '10:42 AM'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      text: "I'll inspect the project structure, review the authentication module, and propose the required changes before applying them.",
      time: '10:42 AM',
      model: 'Gemini 2.5 Flash'
    }
  ])

  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages or tokens arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load existing conversation on mount if available
  useEffect(() => {
    if (window.electronApi?.getConversation) {
      window.electronApi.getConversation(conversationId).then((res) => {
        if (res && res.messages.length > 0) {
          setMessages(
            res.messages.map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              text: m.content,
              time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              model: m.modelId || undefined
            }))
          )
        }
      }).catch(console.error)
    }
  }, [conversationId])

  // Setup streaming token listener
  useEffect(() => {
    if (!window.electronApi?.onStreamToken) return

    const unsubscribe = window.electronApi.onStreamToken((data) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1]
        if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.isStreaming) {
          return prev
        }

        if (data.error) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              text: lastMsg.text + (lastMsg.text ? '\n\n' : '') + `[Error: ${data.error}]`,
              isStreaming: false,
              error: data.error
            }
          ]
        }

        if (data.isComplete) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              isStreaming: false
            }
          ]
        }

        return [
          ...prev.slice(0, -1),
          {
            ...lastMsg,
            text: lastMsg.text + data.delta
          }
        ]
      })

      if (data.isComplete || data.error) {
        setIsStreaming(false)
        setActiveRunId(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Setup failover event listener
  useEffect(() => {
    if (!window.electronApi?.onFailoverEvent) return

    const unsubscribe = window.electronApi.onFailoverEvent((data) => {
      setFailoverNotice({
        from: `${data.fromProvider} (${data.fromModel})`,
        to: `${data.toProvider} (${data.toModel})`,
        reason: data.reason,
        isSilent: data.isSilent,
        resetEta: data.resetEta
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleSendPrompt = async (text: string) => {
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsgId = `msg-${Date.now()}`
    const assistantMsgId = `msg-assistant-${Date.now()}`

    // Optimistically add user message and streaming assistant placeholder
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text,
        time: userTime
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        time: userTime,
        model: connectedModel.name,
        isStreaming: true
      }
    ])

    setIsStreaming(true)
    setHasActiveRun(true)

    try {
      if (window.electronApi?.sendPrompt) {
        // Map connected provider name to ID
        const providerId = connectedModel.provider.toLowerCase().includes('groq') ? 'groq' : 'gemini'
        const modelId = connectedModel.name.toLowerCase().includes('pro') ? 'gemini-2.5-pro' : 'gemini-2.5-flash'

        const result = await window.electronApi.sendPrompt({
          conversationId,
          prompt: text,
          modelId,
          providerId,
          workspacePath: workspace.path
        })

        if (!result.success) {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              id: assistantMsgId,
              role: 'assistant',
              text: `Failed to initiate generation: ${result.error || 'Unknown error'}`,
              time: userTime,
              isStreaming: false,
              error: result.error
            }
          ])
          setIsStreaming(false)
        } else if (result.runId) {
          setActiveRunId(result.runId)
        }
      } else {
        // Fallback local simulation if running in pure browser
        setTimeout(() => {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              id: assistantMsgId,
              role: 'assistant',
              text: `Simulated local response for: "${text}"`,
              time: userTime,
              isStreaming: false
            }
          ])
          setIsStreaming(false)
        }, 1000)
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          id: assistantMsgId,
          role: 'assistant',
          text: `Request error: ${err.message}`,
          time: userTime,
          isStreaming: false,
          error: err.message
        }
      ])
      setIsStreaming(false)
    }
  }

  const handleCancelRun = async () => {
    if (activeRunId && window.electronApi?.cancelRun) {
      await window.electronApi.cancelRun(activeRunId)
    }
    setIsStreaming(false)
    setActiveRunId(null)
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.isStreaming) {
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            text: last.text + ' [Generation stopped by user]',
            isStreaming: false
          }
        ]
      }
      return prev
    })
  }

  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`
    setConversationId(newId)
    setMessages([])
    setIsStreaming(false)
    setActiveRunId(null)
  }

  // If user hasn't started any run and no project is open, show WelcomeHero
  if (!hasActiveRun && !workspace.path && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <WelcomeHero />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface relative min-w-0 overflow-hidden font-sans">
      {/* Top Context Bar / Banner */}
      <div className="h-12 bg-surface-container-lowest flex items-center justify-between px-space-xl z-10 border-b border-surface-container-high/60 shrink-0">
        <div className="flex items-center gap-space-md min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isStreaming ? 'bg-primary animate-ping' : 'bg-tertiary animate-pulse'
            }`}
          />
          <span className="text-headline-sm text-on-surface truncate font-medium text-xs">
            {workspace.name ? `Workspace: ${workspace.name}` : 'Agent Workspace Session'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono shrink-0 border border-outline-variant/20">
            {isStreaming ? 'Generating...' : 'Ready'}
          </span>
        </div>

        <div className="flex items-center gap-space-sm shrink-0">
          {isStreaming ? (
            <button
              onClick={handleCancelRun}
              className="flex items-center gap-space-xs px-space-md py-1 rounded bg-error/20 hover:bg-error text-error hover:text-on-error text-xs font-mono transition-colors border border-error/30"
              title="Stop Generation"
            >
              <Icon name="close" size={14} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-space-xs px-space-md py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono transition-colors border border-outline-variant/20"
              title="Start New Conversation"
            >
              <Icon name="add" size={14} />
              <span>New Chat</span>
            </button>
          )}

          <button
            onClick={() => setActiveView('ai-providers')}
            className="flex items-center gap-space-xs px-space-md py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono transition-colors border border-outline-variant/20"
            title="Configure Models"
          >
            <Icon name="tune" size={14} />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* Scrollable Conversation Area */}
      <div className="flex-1 overflow-y-auto px-space-xl py-space-xl flex flex-col gap-space-xl">
        {messages.map((msg) => {
          const isUser = msg.role === 'user'

          return (
            <div
              key={msg.id}
              className={`flex gap-space-lg ${isUser ? 'max-w-3xl' : 'max-w-4xl'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-outline-variant/30 ${
                  isUser ? 'bg-surface-container-high' : 'bg-primary-container text-on-primary-container shadow-sm'
                }`}
              >
                <Icon name={isUser ? 'person' : 'smart_toy'} size={18} />
              </div>

              <div className="flex flex-col gap-space-xs flex-1 min-w-0">
                <div className="flex items-center gap-space-sm">
                  <span className="font-headline-sm text-on-surface font-semibold text-xs">
                    {isUser ? 'You' : msg.model || connectedModel.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-mono">{msg.time}</span>
                  {!isUser && isStreaming && msg.isStreaming && (
                    <span className="text-[10px] text-tertiary font-mono animate-pulse">
                      Streaming...
                    </span>
                  )}
                </div>

                <div
                  className={`text-body-md text-on-surface p-space-lg rounded-xl border border-outline-variant/20 shadow-sm leading-relaxed text-xs whitespace-pre-wrap ${
                    isUser ? 'bg-surface-container-lowest' : 'bg-surface-container-low'
                  } ${msg.error ? 'border-error/40 text-error' : ''}`}
                >
                  {msg.text || (msg.isStreaming ? 'Thinking...' : '')}
                </div>

                {/* Show timeline and tool activity for the demo/sample assistant response */}
                {!isUser && msg.id === 'msg-2' && (
                  <div className="flex flex-col gap-space-md mt-space-sm">
                    <ExecutionTimeline />
                    <ToolActivityStream />
                    <FileChangeBanner />
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* Failover Alert Pill */}
      {failoverNotice && (
        <div
          className={`mx-space-xl mb-2 px-space-md py-2 rounded-xl text-xs flex items-center justify-between border animate-fade-in ${
            failoverNotice.isSilent
              ? 'bg-secondary-container/40 border-secondary/40 text-on-surface'
              : 'bg-error-container/30 border-error/40 text-error'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon name="swap_horiz" size={16} className={failoverNotice.isSilent ? 'text-secondary' : 'text-error'} />
            <span>
              {failoverNotice.isSilent ? (
                <>
                  Seamless Failover: Switched from <strong className="font-mono">{failoverNotice.from}</strong> to{' '}
                  <strong className="font-mono">{failoverNotice.to}</strong> ({failoverNotice.reason})
                </>
              ) : (
                <>
                  Stream interrupted on <strong className="font-mono">{failoverNotice.from}</strong>: {failoverNotice.reason}
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => setFailoverNotice(null)}
            className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Chat Composer Anchored at Bottom */}
      <PromptComposer onSend={handleSendPrompt} disabled={isStreaming} />
    </div>
  )
}

export default ChatView
