import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { soundService } from '../services/sound-service'

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  model?: string
  isStreaming?: boolean
  error?: string
}

export interface FailoverNotice {
  from: string
  to: string
  reason: string
  isSilent: boolean
  resetEta?: string | null
}

export type ViewId =
  | 'chat'
  | 'ai-providers'
  | 'usage-quotas'
  | 'settings'
  | (string & {}) // Allows any future view extension

export type ThemeMode = 'versarail-dark' | 'light' | 'system'

export interface WorkspaceInfo {
  path: string | null
  name: string | null
}

export interface ConnectedModelInfo {
  name: string
  provider: string
  providerId?: string
  isConnected: boolean
}

export interface ConversationItem {
  id: string
  title: string
  selectedModel: string
  workspacePath?: string | null
  createdAt: string
  updatedAt: string
}

export interface DialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  type?: 'confirm' | 'alert'
}

export interface DialogState extends DialogOptions {
  isOpen: boolean
  resolve?: (value: boolean) => void
}

export interface UiState {
  activeView: ViewId
  setActiveView: (view: ViewId) => void

  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void

  isInspectorOpen: boolean
  toggleInspector: () => void
  setInspectorOpen: (open: boolean) => void

  workspace: WorkspaceInfo
  setWorkspace: (ws: WorkspaceInfo) => void
  selectWorkspaceFolder: () => Promise<void>
  recentWorkspaces: WorkspaceInfo[]
  openWorkspacePath: (folderPath: string) => Promise<void>
  closeWorkspace: () => void

  connectedModel: ConnectedModelInfo
  setConnectedModel: (model: ConnectedModelInfo) => void

  hasActiveRun: boolean
  setHasActiveRun: (active: boolean) => void

  activeConversationId: string
  setActiveConversationId: (id: string) => void
  conversations: ConversationItem[]
  loadConversations: () => Promise<void>
  startNewChat: () => string
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, newTitle: string) => Promise<void>

  // Persistent multi-conversation background streaming state
  messagesByConv: Record<string, ChatMessageItem[]>
  streamingByConv: Record<string, boolean>
  activeRunIdByConv: Record<string, string | null>
  failoverNoticeByConv: Record<string, FailoverNotice | null>
  loadConversationMessages: (conversationId: string) => Promise<void>
  sendChatPrompt: (prompt: string, conversationId?: string) => Promise<void>
  cancelChatRun: (conversationId: string) => Promise<void>
  dismissFailoverNotice: (conversationId: string) => void

  dialogState: DialogState
  showConfirm: (options: DialogOptions | string) => Promise<boolean>
  showAlert: (options: DialogOptions | string) => Promise<void>
  closeDialog: (confirmed: boolean) => void
}

const UiContext = createContext<UiState | undefined>(undefined)

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ViewId>('chat')
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('versarail_theme') as ThemeMode) || 'versarail-dark'
  })
  const [isInspectorOpen, setInspectorOpen] = useState(true)
  const [workspace, setWorkspace] = useState<WorkspaceInfo>({
    path: null,
    name: null
  })
  const [recentWorkspaces, setRecentWorkspaces] = useState<WorkspaceInfo[]>(() => {
    try {
      const saved = localStorage.getItem('versarail_recent_workspaces')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const saveRecentWorkspace = (ws: WorkspaceInfo) => {
    if (!ws.path) return
    setRecentWorkspaces((prev) => {
      const filtered = prev.filter((p) => p.path !== ws.path)
      const updated = [ws, ...filtered].slice(0, 8)
      try {
        localStorage.setItem('versarail_recent_workspaces', JSON.stringify(updated))
      } catch {
        // ignore storage errors
      }
      return updated
    })
  }

  const openWorkspacePath = async (folderPath: string) => {
    const parts = folderPath.split(/[/\\]/)
    const name = parts[parts.length - 1] || folderPath
    const newWs = { path: folderPath, name }
    setWorkspace(newWs)
    saveRecentWorkspace(newWs)
    if (window.electronApi?.setWorkspace) {
      try {
        await window.electronApi.setWorkspace(folderPath)
      } catch (err) {
        console.error('[useUiStore] Failed to sync workspace to backend:', err)
      }
    }
    setActiveView('chat')
  }

  const closeWorkspace = () => {
    setWorkspace({ path: null, name: null })
  }
  const [connectedModel, setConnectedModel] = useState<ConnectedModelInfo>({
    name: 'AI Agent (Auto-Switch)',
    provider: 'Universal AI Agent',
    providerId: 'auto',
    isConnected: true
  })
  const [hasActiveRun, setHasActiveRun] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-default')
  const [conversations, setConversations] = useState<ConversationItem[]>([])

  // Persistent multi-conversation background streaming state
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessageItem[]>>({})
  const [streamingByConv, setStreamingByConv] = useState<Record<string, boolean>>({})
  const [activeRunIdByConv, setActiveRunIdByConv] = useState<Record<string, string | null>>({})
  const [failoverNoticeByConv, setFailoverNoticeByConv] = useState<Record<string, FailoverNotice | null>>({})

  const streamingByConvRef = useRef<Record<string, boolean>>({})
  const activeRunIdByConvRef = useRef<Record<string, string | null>>({})
  const runToConvRef = useRef<Map<string, string>>(new Map())
  const activeConversationIdRef = useRef<string>(activeConversationId)
  const connectedModelRef = useRef<ConnectedModelInfo>(connectedModel)
  const workspacePathRef = useRef<string | null>(workspace.path)

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    connectedModelRef.current = connectedModel
  }, [connectedModel])

  useEffect(() => {
    workspacePathRef.current = workspace.path
  }, [workspace.path])

  const updateStreamingState = useCallback((convId: string, isStreaming: boolean) => {
    const next = { ...streamingByConvRef.current, [convId]: isStreaming }
    streamingByConvRef.current = next
    setStreamingByConv(next)
    setHasActiveRun(Object.values(next).some(Boolean))
  }, [])

  const loadConversations = useCallback(async () => {
    if (window.electronApi?.listConversations) {
      try {
        const list = await window.electronApi.listConversations()
        setConversations(list || [])
      } catch (err) {
        console.error('[useUiStore] Failed to list conversations:', err)
      }
    }
  }, [])

  const loadConversationMessages = useCallback(async (convId: string) => {
    if (!convId) return
    // Preserve live streaming tokens in memory if this conversation is actively running
    if (streamingByConvRef.current[convId]) {
      return
    }
    if (window.electronApi?.getConversation) {
      try {
        const res = await window.electronApi.getConversation(convId)
        if (streamingByConvRef.current[convId]) {
          return
        }
        if (res && res.messages && res.messages.length > 0) {
          setMessagesByConv((prev) => ({
            ...prev,
            [convId]: res.messages.map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              text: m.content,
              time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              model: m.modelId || undefined
            }))
          }))
        } else {
          setMessagesByConv((prev) => ({ ...prev, [convId]: [] }))
        }
      } catch (err) {
        console.error('[useUiStore] Failed to load conversation:', err)
      }
    }
  }, [])

  const dismissFailoverNotice = useCallback((convId: string) => {
    setFailoverNoticeByConv((prev) => ({ ...prev, [convId]: null }))
  }, [])

  const sendChatPrompt = useCallback(
    async (text: string, convIdOverride?: string) => {
      const targetConvId = convIdOverride || activeConversationIdRef.current
      const modelInfo = connectedModelRef.current
      const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const userMsgId = `user-${Date.now()}`
      const assistantMsgId = `ai-${Date.now() + 1}`

      setFailoverNoticeByConv((prev) => ({ ...prev, [targetConvId]: null }))

      if (!modelInfo.isConnected || modelInfo.name === 'No Model Connected') {
        setMessagesByConv((prev) => ({
          ...prev,
          [targetConvId]: [
            ...(prev[targetConvId] || []),
            { id: userMsgId, role: 'user', text, time: userTime },
            {
              id: assistantMsgId,
              role: 'assistant',
              text: '[Warning] No active AI provider configured. Please go to AI Providers in the sidebar and enter your Gemini, Groq, Cerebras, OpenRouter, or custom key.',
              time: userTime,
              isStreaming: false,
              error: 'No provider connected'
            }
          ]
        }))
        return
      }

      setMessagesByConv((prev) => ({
        ...prev,
        [targetConvId]: [
          ...(prev[targetConvId] || []),
          { id: userMsgId, role: 'user', text, time: userTime },
          {
            id: assistantMsgId,
            role: 'assistant',
            text: '',
            time: userTime,
            model: modelInfo.name,
            isStreaming: true
          }
        ]
      }))

      updateStreamingState(targetConvId, true)

      try {
        if (window.electronApi?.sendPrompt) {
          const isAuto =
            modelInfo.providerId === 'auto' ||
            modelInfo.name.includes('(Auto') ||
            modelInfo.name.startsWith('auto/')
          const providerId = isAuto ? 'auto' : (modelInfo.providerId as string) || 'gemini'
          const modelId = isAuto
            ? modelInfo.name.startsWith('auto/')
              ? modelInfo.name
              : 'auto/free'
            : modelInfo.name

          const result = await window.electronApi.sendPrompt({
            conversationId: targetConvId,
            prompt: text,
            modelId,
            providerId,
            workspacePath: workspacePathRef.current
          })
          loadConversations()

          if (!result.success) {
            setMessagesByConv((prev) => {
              const list = prev[targetConvId] || []
              const last = list[list.length - 1]
              if (!last || !last.isStreaming) return prev
              return {
                ...prev,
                [targetConvId]: [
                  ...list.slice(0, -1),
                  {
                    ...last,
                    text: `Failed to initiate generation: ${result.error || 'Unknown error'}`,
                    isStreaming: false,
                    error: result.error
                  }
                ]
              }
            })
            updateStreamingState(targetConvId, false)
            activeRunIdByConvRef.current[targetConvId] = null
            setActiveRunIdByConv((prev) => ({ ...prev, [targetConvId]: null }))
          } else if (result.runId) {
            activeRunIdByConvRef.current[targetConvId] = result.runId
            setActiveRunIdByConv((prev) => ({ ...prev, [targetConvId]: result.runId || null }))
          }
        } else {
          setTimeout(() => {
            setMessagesByConv((prev) => {
              const list = prev[targetConvId] || []
              if (list.length === 0) return prev
              const last = list[list.length - 1]
              return {
                ...prev,
                [targetConvId]: [
                  ...list.slice(0, -1),
                  {
                    ...last,
                    text: `Simulated local response for: "${text}"`,
                    isStreaming: false
                  }
                ]
              }
            })
            updateStreamingState(targetConvId, false)
          }, 1000)
        }
      } catch (err: any) {
        setMessagesByConv((prev) => {
          const list = prev[targetConvId] || []
          const last = list[list.length - 1]
          if (!last || !last.isStreaming) return prev
          return {
            ...prev,
            [targetConvId]: [
              ...list.slice(0, -1),
              {
                ...last,
                text: `Request error: ${err.message}`,
                isStreaming: false,
                error: err.message
              }
            ]
          }
        })
        updateStreamingState(targetConvId, false)
      }
    },
    [loadConversations, updateStreamingState]
  )

  const cancelChatRun = useCallback(
    async (convId: string) => {
      const runId = activeRunIdByConvRef.current[convId]
      if (runId && window.electronApi?.cancelRun) {
        await window.electronApi.cancelRun(runId)
      }
      updateStreamingState(convId, false)
      activeRunIdByConvRef.current[convId] = null
      setActiveRunIdByConv((prev) => ({ ...prev, [convId]: null }))
      setMessagesByConv((prev) => {
        const list = prev[convId] || []
        const last = list[list.length - 1]
        if (last && last.isStreaming) {
          return {
            ...prev,
            [convId]: [
              ...list.slice(0, -1),
              {
                ...last,
                text: last.text ? `${last.text}\n\n[Generation stopped by user]` : '[Generation stopped by user]',
                isStreaming: false
              }
            ]
          }
        }
        return prev
      })
    },
    [updateStreamingState]
  )

  // Persistent root-level stream token listener (never unmounts across view or conversation switches!)
  useEffect(() => {
    if (!window.electronApi?.onStreamToken) return

    const unsubscribe = window.electronApi.onStreamToken((data) => {
      const convId =
        data.conversationId ||
        (data.runId ? runToConvRef.current.get(data.runId) : undefined) ||
        activeConversationIdRef.current

      if (data.runId && convId) {
        runToConvRef.current.set(data.runId, convId)
        if (!data.isComplete && !data.error) {
          if (activeRunIdByConvRef.current[convId] !== data.runId) {
            activeRunIdByConvRef.current[convId] = data.runId
            setActiveRunIdByConv((prev) => ({ ...prev, [convId]: data.runId }))
            // Refresh sidebar list so new background chat appears immediately with Generating indicator
            loadConversations()
          }
        }
      }

      // Initial runId registration pulse (delta is empty and run is not complete/error)
      if (!data.delta && !data.isComplete && !data.error) {
        if (data.modelId && data.modelId !== 'auto/free') {
          setMessagesByConv((prev) => {
            const list = prev[convId] || []
            const lastMsg = list[list.length - 1]
            if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.isStreaming || lastMsg.model === data.modelId) {
              return prev
            }
            return {
              ...prev,
              [convId]: [...list.slice(0, -1), { ...lastMsg, model: data.modelId }]
            }
          })
        }
        return
      }

      setMessagesByConv((prev) => {
        const list = prev[convId] || []
        const lastMsg = list[list.length - 1]
        if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.isStreaming) {
          return prev
        }

        const resolvedModel = data.modelId && data.modelId !== 'auto/free' ? data.modelId : lastMsg.model

        if (data.error) {
          soundService.play('error')
          const isCancel = data.error.includes('cancelled')
          const formattedErr = isCancel ? '[Generation cancelled by user]' : `[Error: ${data.error}]`
          const nextText = lastMsg.text ? `${lastMsg.text}\n\n${formattedErr}` : formattedErr
          return {
            ...prev,
            [convId]: [
              ...list.slice(0, -1),
              {
                ...lastMsg,
                model: resolvedModel,
                text: nextText,
                isStreaming: false,
                error: data.error
              }
            ]
          }
        }

        if (data.isComplete) {
          loadConversations()
          soundService.play('success')
          const finalText = lastMsg.text.trim()
            ? lastMsg.text
            : '[No response received from model. Upstream provider closed connection without emitting tokens.]'
          return {
            ...prev,
            [convId]: [
              ...list.slice(0, -1),
              {
                ...lastMsg,
                model: resolvedModel,
                text: finalText,
                isStreaming: false
              }
            ]
          }
        }

        return {
          ...prev,
          [convId]: [
            ...list.slice(0, -1),
            {
              ...lastMsg,
              model: resolvedModel,
              text: lastMsg.text + data.delta
            }
          ]
        }
      })

      if (data.isComplete || data.error) {
        updateStreamingState(convId, false)
        activeRunIdByConvRef.current[convId] = null
        setActiveRunIdByConv((prev) => ({ ...prev, [convId]: null }))
        if (data.runId) {
          runToConvRef.current.delete(data.runId)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [loadConversations, updateStreamingState])

  // Persistent root-level failover event listener
  useEffect(() => {
    if (!window.electronApi?.onFailoverEvent) return

    const unsubscribe = window.electronApi.onFailoverEvent((data) => {
      const convId =
        data.conversationId ||
        (data.runId ? runToConvRef.current.get(data.runId) : undefined) ||
        activeConversationIdRef.current

      setFailoverNoticeByConv((prev) => ({
        ...prev,
        [convId]: {
          from: `${data.fromProvider} (${data.fromModel})`,
          to: `${data.toProvider} (${data.toModel})`,
          reason: data.reason,
          isSilent: data.isSilent,
          resetEta: data.resetEta
        }
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const startNewChat = () => {
    const newId = `conv-${Date.now()}`
    setActiveConversationId(newId)
    setActiveView('chat')
    return newId
  }

  const deleteConversation = async (id: string) => {
    if (window.electronApi?.deleteConversation) {
      try {
        await window.electronApi.deleteConversation(id)
        const list = (await window.electronApi.listConversations()) || []
        setConversations(list)
        if (activeConversationId === id) {
          if (list.length > 0) {
            setActiveConversationId(list[0].id)
            setActiveView('chat')
          } else {
            startNewChat()
          }
        }
      } catch (err) {
        console.error('[useUiStore] Failed to delete conversation:', err)
      }
    }
  }

  const renameConversation = async (id: string, newTitle: string) => {
    const trimmed = (newTitle || '').trim()
    if (!trimmed) return
    if (window.electronApi?.renameConversation) {
      try {
        await window.electronApi.renameConversation(id, trimmed)
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: new Date().toISOString() } : c))
        )
      } catch (err) {
        console.error('[useUiStore] Failed to rename conversation:', err)
      }
    } else {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
      )
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  // Sync theme attribute on document root
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('versarail_theme', newTheme)
    const isDark =
      newTheme === 'versarail-dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (newTheme === 'system') {
      document.documentElement.dataset.theme = isDark ? 'versarail-dark' : 'light'
    } else {
      document.documentElement.dataset.theme = newTheme
    }

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    setTheme(theme)
  }, [])

  // Sync with native backend workspace
  useEffect(() => {
    if (window.electronApi?.getCurrentWorkspace) {
      window.electronApi
        .getCurrentWorkspace()
        .then(async (ws) => {
          if (ws && ws.path) {
            setWorkspace(ws)
            saveRecentWorkspace(ws)
          } else if (recentWorkspaces.length > 0 && recentWorkspaces[0]?.path && window.electronApi?.setWorkspace) {
            try {
              const restored = await window.electronApi.setWorkspace(recentWorkspaces[0].path)
              if (restored && restored.path) {
                setWorkspace(restored)
              }
            } catch {
              // ignore
            }
          }
        })
        .catch(console.error)
    }

    if (window.electronApi?.listProviders) {
      window.electronApi.listProviders().then(async (providers) => {
        const active = providers?.find((p) => p.enabled !== false)
        if (active) {
          let modelName =
            active.providerId === 'gemini'
              ? 'gemini-3.5-flash'
              : active.providerId === 'groq'
              ? 'openai/gpt-oss-120b'
              : active.providerId === 'cerebras'
              ? 'llama3.1-70b'
              : active.providerId === 'custom'
              ? 'auto/best-coding'
              : active.providerId === 'kilo'
              ? 'kilo-auto/free'
              : active.providerId === 'pollinations'
              ? 'openai'
              : active.providerId === 'openrouter'
              ? 'openrouter/free'
              : active.providerId === 'huggingface'
              ? 'meta-llama/Llama-3.3-70B-Instruct'
              : 'openrouter/free'

          if (window.electronApi?.listModels) {
            try {
              const models = await window.electronApi.listModels(active.providerId)
              if (models && models.length > 0) {
                if (active.providerId === 'custom') {
                  const autoModel = models.find((m) => m.id === 'auto/gpt' || m.id === 'auto/best-coding' || m.id.startsWith('auto/'))
                  modelName = autoModel ? autoModel.id : models[0].id
                } else {
                  modelName = models[0].id || models[0].name
                }
              }
            } catch {
              // Ignore failure to fetch remote models on startup
            }
          }

          setConnectedModel({
            name: modelName,
            provider: active.label,
            providerId: active.providerId,
            isConnected: true
          })
        }
      }).catch(console.error)
    }
  }, [])

  const selectWorkspaceFolder = async () => {
    if (!window.electronApi?.selectWorkspaceFolder) return
    const result = await window.electronApi.selectWorkspaceFolder()
    if (!result.canceled && result.path) {
      const parts = result.path.split(/[/\\]/)
      const name = parts[parts.length - 1] || result.path
      const newWs = { path: result.path, name }
      setWorkspace(newWs)
      saveRecentWorkspace(newWs)
      if (window.electronApi?.setWorkspace) {
        try {
          await window.electronApi.setWorkspace(result.path)
        } catch (err) {
          console.error('[useUiStore] Failed to sync workspace to backend:', err)
        }
      }
      // When opening a folder, auto switch to chat view
      setActiveView('chat')
    }
  }

  const toggleInspector = () => setInspectorOpen((prev) => !prev)

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    message: ''
  })

  const showConfirm = useCallback((options: DialogOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const opts: DialogOptions = typeof options === 'string' ? { message: options } : options
      setDialogState({
        isOpen: true,
        title: opts.title || 'Confirm Action',
        message: opts.message,
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        variant: opts.variant || 'danger',
        type: 'confirm',
        resolve
      })
    })
  }, [])

  const showAlert = useCallback((options: DialogOptions | string): Promise<void> => {
    return new Promise<void>((resolve) => {
      const opts: DialogOptions = typeof options === 'string' ? { message: options } : options
      setDialogState({
        isOpen: true,
        title: opts.title || 'Notice',
        message: opts.message,
        confirmText: opts.confirmText || 'OK',
        cancelText: '',
        variant: opts.variant || 'info',
        type: 'alert',
        resolve: () => resolve()
      })
    })
  }, [])

  const closeDialog = useCallback((confirmed: boolean) => {
    setDialogState((prev) => {
      prev.resolve?.(confirmed)
      return { ...prev, isOpen: false, resolve: undefined }
    })
  }, [])

  const value: UiState = {
    activeView,
    setActiveView,
    theme,
    setTheme,
    isInspectorOpen,
    toggleInspector,
    setInspectorOpen,
    workspace,
    setWorkspace,
    selectWorkspaceFolder,
    recentWorkspaces,
    openWorkspacePath,
    closeWorkspace,
    connectedModel,
    setConnectedModel,
    hasActiveRun,
    setHasActiveRun,
    activeConversationId,
    setActiveConversationId,
    conversations,
    loadConversations,
    startNewChat,
    deleteConversation,
    renameConversation,
    messagesByConv,
    streamingByConv,
    activeRunIdByConv,
    failoverNoticeByConv,
    loadConversationMessages,
    sendChatPrompt,
    cancelChatRun,
    dismissFailoverNotice,
    dialogState,
    showConfirm,
    showAlert,
    closeDialog
  }

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export const useUiStore = (): UiState => {
  const context = useContext(UiContext)
  if (!context) {
    throw new Error('useUiStore must be used within a UiProvider')
  }
  return context
}
