import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useUiStore } from '../../app/useUiStore'
import WelcomeHero from '../workspace/WelcomeHero'
import PromptComposer from './PromptComposer'
import Icon from '../../components/common/Icon'
import TerminalPanel from '../terminal/TerminalPanel'
import { TodoDock } from './TodoDock'
import { soundService } from '../../services/sound-service'

interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  model?: string
  isStreaming?: boolean
  error?: string
}

const MessageContent: React.FC<{ text: string }> = ({ text }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const parts = useMemo(() => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g
    const result: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', content: text.slice(lastIndex, match.index) })
      }
      result.push({ type: 'code', lang: match[1] || 'plaintext', content: match[2].trimEnd() })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', content: text.slice(lastIndex) })
    }

    return result
  }, [text])

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (parts.length === 1 && parts[0].type === 'text') {
    return <div className="whitespace-pre-wrap">{text}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {parts.map((part: { type: 'text' | 'code'; content: string; lang?: string }, i: number) => {
        if (part.type === 'code') {
          return (
            <div key={i} className="my-1.5 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-lowest font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-high/70 border-b border-outline-variant text-[11px] text-on-surface-variant select-none">
                <span className="font-semibold uppercase tracking-wider font-mono">{part.lang}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(part.content, i)}
                  className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  <Icon name={copiedIndex === i ? 'check' : 'content_copy'} size={12} className={copiedIndex === i ? 'text-primary' : ''} />
                  <span>{copiedIndex === i ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-on-surface leading-relaxed">{part.content}</pre>
            </div>
          )
        }
        return <div key={i} className="whitespace-pre-wrap">{part.content}</div>
      })}
    </div>
  )
}

export const ChatView: React.FC = () => {
  const {
    hasActiveRun,
    setHasActiveRun,
    connectedModel,
    workspace,
    setActiveView,
    selectWorkspaceFolder,
    recentWorkspaces,
    openWorkspacePath,
    closeWorkspace,
    isInspectorOpen,
    toggleInspector,
    setInspectorTab,
    activeConversationId,
    startNewChat,
    loadConversations
  } = useUiStore()
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)
  const projectMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setIsProjectMenuOpen(false)
      }
    }
    if (isProjectMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProjectMenuOpen])

  const handleCopyPath = () => {
    if (workspace.path) {
      navigator.clipboard.writeText(workspace.path)
      setCopiedPath(true)
      setTimeout(() => setCopiedPath(false), 2000)
    }
  }
  const [failoverNotice, setFailoverNotice] = useState<{
    from: string
    to: string
    reason: string
    isSilent: boolean
    resetEta?: string | null
  } | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])

  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages or tokens arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load existing conversation on mount or when active conversation changes
  useEffect(() => {
    setIsStreaming(false)
    setHasActiveRun(false)
    setActiveRunId(null)
    setFailoverNotice(null)

    if (window.electronApi?.getConversation) {
      window.electronApi
        .getConversation(activeConversationId)
        .then((res) => {
          if (res && res.messages && res.messages.length > 0) {
            setMessages(
              res.messages.map((m) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                text: m.content,
                time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: m.modelId || undefined
              }))
            )
          } else {
            setMessages([])
          }
        })
        .catch((err) => {
          console.error('[ChatView] Failed to load conversation:', err)
          setMessages([])
        })
    } else {
      setMessages([])
    }
  }, [activeConversationId])

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
          soundService.play('error')
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              text: lastMsg.text ? `${lastMsg.text}\n\n[Error: ${data.error}]` : `[Error: ${data.error}]`,
              isStreaming: false,
              error: data.error
            }
          ]
        }

        if (data.isComplete) {
          loadConversations()
          soundService.play('success')
          const finalText = lastMsg.text.trim()
            ? lastMsg.text
            : (data.error ? `[Error: ${data.error}]` : '[No response received from model. Upstream provider closed connection without emitting tokens.]')
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              text: finalText,
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
        setHasActiveRun(false)
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

    // Check if any provider is connected
    if (!connectedModel.isConnected || connectedModel.name === 'No Model Connected') {
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
          text: 'No AI provider is connected yet. Please navigate to AI Providers and add an API key (e.g. Google Gemini, Groq, Cerebras, or OmniRoute) to start generating responses.',
          time: userTime,
          isStreaming: false,
          error: 'No provider connected'
        }
      ])
      setIsStreaming(false)
      setHasActiveRun(false)
      return
    }

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
        // Resolve provider and model ID (support universal AI Agent auto-switch)
        const isAuto =
          connectedModel.providerId === 'auto' ||
          connectedModel.name.includes('(Auto') ||
          connectedModel.name.startsWith('auto/')
        const providerId = isAuto ? 'auto' : (connectedModel.providerId as string) || 'gemini'
        const modelId = isAuto ? (connectedModel.name.startsWith('auto/') ? connectedModel.name : 'auto/free') : connectedModel.name

        const result = await window.electronApi.sendPrompt({
          conversationId: activeConversationId,
          prompt: text,
          modelId,
          providerId,
          workspacePath: workspace.path
        })
        loadConversations()

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
          setHasActiveRun(false)
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
          setHasActiveRun(false)
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
      setHasActiveRun(false)
    }
  }

  const handleCancelRun = async () => {
    if (activeRunId && window.electronApi?.cancelRun) {
      await window.electronApi.cancelRun(activeRunId)
    }
    setIsStreaming(false)
    setHasActiveRun(false)
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
    startNewChat()
    setMessages([])
    setIsStreaming(false)
    setActiveRunId(null)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface relative min-w-0 overflow-hidden font-sans">
      {/* Top Context Bar / Banner */}
      <div className="h-12 bg-surface-container-lowest flex items-center justify-between px-space-xl z-10 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-space-sm min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isStreaming ? 'bg-primary animate-ping' : 'bg-emerald-500 animate-pulse'
            }`}
          />

          {/* Project Management Popover Trigger */}
          <div className="relative" ref={projectMenuRef}>
            <button
              onClick={() => setIsProjectMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant text-xs cursor-pointer group"
              title="Click to manage or switch workspace projects"
            >
              <Icon name="folder_open" size={15} className="text-primary shrink-0" />
              <span className="font-semibold text-on-surface truncate max-w-[170px]">
                {workspace.name || 'Select Project Folder'}
              </span>
              <Icon
                name="arrow_drop_down"
                size={14}
                className="text-on-surface-variant group-hover:text-on-surface transition-colors"
              />
            </button>

            {/* Dropdown Popover */}
            {isProjectMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-surface-container border border-outline-variant rounded-xl shadow-2xl p-space-md flex flex-col gap-space-sm z-50 animate-fade-in font-sans">
                {/* Active Project Header */}
                <div className="flex flex-col gap-1 pb-space-xs border-b border-border-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider">
                      Active Workspace
                    </span>
                    {workspace.path && (
                      <button
                        onClick={handleCopyPath}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1 font-mono cursor-pointer"
                        title="Copy full directory path"
                      >
                        <Icon name={copiedPath ? 'check' : 'copy'} size={11} />
                        <span>{copiedPath ? 'Copied' : 'Copy Path'}</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="folder" size={16} className="text-primary shrink-0" />
                    <span className="text-xs font-semibold text-on-surface truncate">
                      {workspace.name || 'No Project Loaded'}
                    </span>
                  </div>
                  {workspace.path ? (
                    <span className="text-[10px] font-mono text-on-surface-variant truncate" title={workspace.path}>
                      {workspace.path}
                    </span>
                  ) : (
                    <span className="text-[11px] text-on-surface-variant">
                      Open a folder to allow the AI agent to edit files and run terminal commands.
                    </span>
                  )}
                </div>

                {/* Primary Actions */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={async () => {
                      setIsProjectMenuOpen(false)
                      await selectWorkspaceFolder()
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm text-left"
                  >
                    <Icon name="folder_open" size={14} />
                    <span>{workspace.path ? 'Switch Workspace Folder...' : 'Open Workspace Folder...'}</span>
                  </button>

                  {workspace.path && (
                    <>
                      <button
                        onClick={() => {
                          setIsProjectMenuOpen(false)
                          setInspectorTab('files')
                          if (!isInspectorOpen) toggleInspector()
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-high text-on-surface text-xs transition-colors cursor-pointer text-left"
                      >
                        <Icon name="description" size={14} className="text-tertiary" />
                        <span>Inspect Project Files</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProjectMenuOpen(false)
                          setInspectorTab('changes')
                          if (!isInspectorOpen) toggleInspector()
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-high text-on-surface text-xs transition-colors cursor-pointer text-left"
                      >
                        <Icon name="difference" size={14} className="text-secondary" />
                        <span>Review File Changes &amp; Diffs</span>
                      </button>

                      <button
                        onClick={() => {
                          closeWorkspace()
                          setIsProjectMenuOpen(false)
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-error/15 text-error text-xs transition-colors cursor-pointer text-left"
                      >
                        <Icon name="close" size={14} />
                        <span>Close Active Workspace</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Recent Projects Section */}
                {recentWorkspaces.length > 0 && (
                  <div className="pt-space-xs border-t border-border-subtle flex flex-col gap-1">
                    <span className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider px-1">
                      Recent Projects
                    </span>
                    <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                      {recentWorkspaces.map((proj) => {
                        const isCurrent = proj.path === workspace.path
                        return (
                          <button
                            key={proj.path || proj.name}
                            onClick={() => {
                              if (proj.path) {
                                openWorkspacePath(proj.path)
                                setIsProjectMenuOpen(false)
                              }
                            }}
                            className={`flex items-center justify-between px-2 py-1 rounded text-left text-xs transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate min-w-0">
                              <Icon name="folder" size={13} className="text-primary shrink-0" />
                              <span className="truncate">{proj.name}</span>
                            </div>
                            {isCurrent && <Icon name="check" size={12} className="text-primary shrink-0 ml-1" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono shrink-0 border border-outline-variant">
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
              className="flex items-center gap-space-xs px-space-md py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono transition-colors border border-outline-variant"
              title="Start New Conversation"
            >
              <Icon name="add" size={14} />
              <span>New Chat</span>
            </button>
          )}

          <button
            onClick={() => setIsTerminalOpen((prev) => !prev)}
            className={`flex items-center gap-space-xs px-space-md py-1 rounded text-xs font-mono transition-colors border ${
              isTerminalOpen
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant'
            }`}
            title="Toggle Developer Interactive Terminal"
          >
            <Icon name="terminal" size={14} />
            <span>Terminal</span>
          </button>

          {/* Files & Diffs Inspector Toggle */}
          <button
            onClick={toggleInspector}
            className={`flex items-center gap-space-xs px-space-md py-1 rounded text-xs font-mono transition-colors border cursor-pointer ${
              isInspectorOpen
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant'
            }`}
            title="Toggle Workspace Files & Diffs Panel"
          >
            <Icon name="description" size={14} />
            <span>Files</span>
          </button>

          <button
            onClick={() => setActiveView('ai-providers')}
            className="flex items-center gap-space-xs px-space-md py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono transition-colors border border-outline-variant"
            title="Configure Models"
          >
            <Icon name="tune" size={14} />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* Scrollable Conversation Area */}
      <div className="flex-1 overflow-y-auto px-space-xl py-space-xl flex flex-col gap-space-xl">
        {messages.length === 0 ? (
          <WelcomeHero onStartPrompt={handleSendPrompt} />
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user'

            return (
              <div
                key={msg.id}
                className={`flex gap-space-lg ${isUser ? 'max-w-3xl' : 'max-w-4xl'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-outline-variant ${
                    isUser ? 'bg-surface-container-high' : 'bg-primary text-on-primary shadow-sm'
                  }`}
                >
                  <Icon name={isUser ? 'person' : 'smart_toy'} size={18} />
                </div>

                <div className="flex flex-col gap-space-xs flex-1 min-w-0">
                  <div className="flex items-center gap-space-sm">
                    <span className="font-headline-sm text-on-surface font-semibold text-xs">
                      {isUser ? 'You' : 'AI Agent'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{msg.time}</span>
                    {!isUser && msg.model && msg.model !== 'AI Agent' && (
                      <span className="text-[9.5px] text-on-surface-variant/70 font-mono bg-surface-container-high px-1.5 py-0.5 rounded border border-outline-variant/30">
                        {msg.model}
                      </span>
                    )}
                    {!isUser && isStreaming && msg.isStreaming && (
                      <span className="text-[10px] text-tertiary font-mono animate-pulse">
                        Streaming...
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-body-md text-on-surface p-space-lg rounded-xl border border-outline-variant shadow-sm leading-relaxed text-xs ${
                      isUser ? 'bg-surface-container-lowest' : 'bg-surface-container'
                    } ${msg.error ? 'border-error/40 text-error' : ''}`}
                  >
                    {!isUser && msg.text && <TodoDock content={msg.text} />}
                    {msg.text ? (
                      <MessageContent text={msg.text} />
                    ) : (
                      <span className="italic text-on-surface-variant">
                        {msg.isStreaming ? 'Thinking...' : '[No response received from model]'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
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

      {/* Developer Interactive Terminal Drawer */}
      {isTerminalOpen && (
        <div className="h-64 shrink-0 px-space-xl pb-2">
          <TerminalPanel onClose={() => setIsTerminalOpen(false)} />
        </div>
      )}

      {/* Chat Composer Anchored at Bottom */}
      <PromptComposer onSend={handleSendPrompt} disabled={isStreaming} />
    </div>
  )
}

export default ChatView
