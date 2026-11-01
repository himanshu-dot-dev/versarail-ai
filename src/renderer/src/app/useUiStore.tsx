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

  connectedModel: ConnectedModelInfo
  setConnectedModel: (model: ConnectedModelInfo) => void

  hasActiveRun: boolean
  setHasActiveRun: (active: boolean) => void
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
  const [connectedModel, setConnectedModel] = useState<ConnectedModelInfo>({
    name: 'No Model Connected',
    provider: 'None',
    isConnected: false
  })
  const [hasActiveRun, setHasActiveRun] = useState(false)

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
      window.electronApi.getCurrentWorkspace().then((ws) => {
        if (ws && ws.path) {
          setWorkspace(ws)
        }
      }).catch(console.error)
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
    connectedModel,
    setConnectedModel,
    hasActiveRun,
    setHasActiveRun
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
