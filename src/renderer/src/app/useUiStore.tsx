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
    name: 'Gemini 2.5 Flash',
    provider: 'Google AI Studio',
    isConnected: true
  })
  const [hasActiveRun, setHasActiveRun] = useState(true)

  // Sync theme attribute on document root
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('versarail_theme', newTheme)
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.dataset.theme = prefersDark ? 'versarail-dark' : 'light'
    } else {
      document.documentElement.dataset.theme = newTheme
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
