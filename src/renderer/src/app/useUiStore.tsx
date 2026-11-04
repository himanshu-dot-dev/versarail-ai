import React, { createContext, useContext, useState, useEffect } from 'react'

export type ViewId =
  | 'chat'
  | 'projects'
  | 'file-explorer'
  | 'ai-providers'
  | 'usage-quotas'
  | 'task-history'
  | 'settings'
  | (string & {}) // Allows any future view extension

export type ThemeMode = 'versarail-dark' | 'light' | 'system'
export type InspectorTab = 'files' | 'activity' | 'changes'

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

export interface UiState {
  activeView: ViewId
  setActiveView: (view: ViewId) => void

  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void

  isInspectorOpen: boolean
  toggleInspector: () => void
  setInspectorOpen: (open: boolean) => void

  inspectorTab: InspectorTab
  setInspectorTab: (tab: InspectorTab) => void

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
}

const UiContext = createContext<UiState | undefined>(undefined)

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ViewId>('chat')
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('versarail_theme') as ThemeMode) || 'versarail-dark'
  })
  const [isInspectorOpen, setInspectorOpen] = useState(true)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('files')
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

  const loadConversations = async () => {
    if (window.electronApi?.listConversations) {
      try {
        const list = await window.electronApi.listConversations()
        setConversations(list || [])
      } catch (err) {
        console.error('[useUiStore] Failed to list conversations:', err)
      }
    }
  }

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
        const active = providers?.find((p) => p.enabled)
        if (active) {
          let modelName =
            active.providerId === 'gemini'
              ? 'gemini-2.5-flash'
              : active.providerId === 'groq'
              ? 'llama-3.3-70b-versatile'
              : active.providerId === 'cerebras'
              ? 'llama3.1-70b'
              : active.providerId === 'custom'
              ? 'auto/best-coding'
              : active.providerId === 'kilo'
              ? 'kilo-auto/free'
              : active.providerId === 'pollinations'
              ? 'openai'
              : 'openrouter'

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

  const value: UiState = {
    activeView,
    setActiveView,
    theme,
    setTheme,
    isInspectorOpen,
    toggleInspector,
    setInspectorOpen,
    inspectorTab,
    setInspectorTab,
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
    deleteConversation
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
