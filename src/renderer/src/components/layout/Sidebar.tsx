import React, { useState, useRef, useEffect } from 'react'
import { useUiStore } from '../../app/useUiStore'
import { viewRegistry } from '../../app/viewRegistry'
import Icon from '../common/Icon'

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = Date.now()
    const diffMs = now - date.getTime()
    if (diffMs < 0) return 'Just now'
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    workspace,
    selectWorkspaceFolder,
    closeWorkspace,
    recentWorkspaces,
    openWorkspacePath,
    isInspectorOpen,
    toggleInspector,
    activeConversationId,
    setActiveConversationId,
    conversations,
    startNewChat,
    deleteConversation,
    renameConversation,
    showConfirm,
    streamingByConv,
    hasActiveRun
  } = useUiStore()

  const [isChatsExpanded, setIsChatsExpanded] = useState(true)
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editTitleInput, setEditTitleInput] = useState<string>('')
  const projectMenuRef = useRef<HTMLDivElement>(null)

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation()
    setEditingConvId(id)
    setEditTitleInput(currentTitle || '')
  }

  const handleSaveRename = async (id: string) => {
    const trimmed = editTitleInput.trim()
    if (trimmed) {
      await renameConversation(id, trimmed)
    }
    setEditingConvId(null)
  }

  const handleCancelRename = () => {
    setEditingConvId(null)
    setEditTitleInput('')
  }

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

  const views = viewRegistry.getAll()

  return (
    <aside className="w-64 h-full bg-surface-container-lowest shrink-0 flex flex-col py-space-md border-r border-border-subtle select-none">
      {/* Active Project Hub (Source of Truth) */}
      <div className="px-space-md mb-space-md relative" ref={projectMenuRef}>
        <div
          onClick={() => setIsProjectMenuOpen((prev) => !prev)}
          className="flex items-center justify-between bg-surface-container px-space-md py-space-sm rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors group border border-outline-variant hover:border-outline shadow-xs"
          title="Click to manage or switch active project"
        >
          <div className="flex items-center gap-space-sm min-w-0">
            <Icon name="folder_open" size={18} className="text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider">
                Active Project
              </span>
              <span className="text-body-sm text-on-surface font-semibold truncate max-w-[130px]">
                {workspace.name || 'Open Folder...'}
              </span>
            </div>
          </div>
          <Icon
            name="unfold_more"
            size={16}
            className="text-on-surface-variant group-hover:text-on-surface transition-colors shrink-0 ml-1"
          />
        </div>

        {/* Project Hub Dropdown Popover */}
        {isProjectMenuOpen && (
          <div className="absolute left-3 top-full mt-1.5 w-72 bg-surface-container border border-outline-variant rounded-xl shadow-2xl p-space-md flex flex-col gap-space-sm z-50 animate-fade-in font-sans">
            {/* Active Project Info */}
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
                  Open a project folder to allow the AI agent to edit files and inspect your codebase.
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
                      if (!isInspectorOpen) toggleInspector()
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-high text-on-surface text-xs transition-colors cursor-pointer text-left"
                  >
                    <Icon name="description" size={14} className="text-tertiary" />
                    <span>Open File Panel</span>
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

      {/* Navigation Links */}
      <nav className="flex-1 px-space-sm flex flex-col gap-1 overflow-y-auto">
        {views.map((view) => {
          const isActive = activeView === view.id

          if (view.id === 'chat') {
            const isChatActive = activeView === 'chat'
            return (
              <div key={view.id} className="flex flex-col">
                {/* Primary Chat Navigation Item */}
                <div
                  onClick={() => setActiveView('chat')}
                  className={`w-full flex items-center justify-between px-space-md py-2 rounded-lg transition-all text-left text-xs cursor-pointer group ${isChatActive
                    ? 'bg-primary/10 text-on-surface dark:bg-white/[0.08] dark:text-on-surface font-semibold border-l-2 border-primary pl-[14px]'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                >
                  <div className="flex items-center gap-space-md truncate">
                    <Icon
                      name={view.icon}
                      size={17}
                      className={isChatActive ? 'text-primary' : 'text-on-surface-variant'}
                    />
                    <span className="truncate">{view.label}</span>
                    {hasActiveRun && (
                      <span
                        className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0"
                        title="AI generation running in background"
                      />
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startNewChat()
                    }}
                    className="opacity-70 group-hover:opacity-100 hover:bg-primary/20 text-primary p-0.5 rounded transition-all cursor-pointer"
                    title="Start New Chat"
                  >
                    <Icon name="add" size={16} />
                  </button>
                </div>

                {/* Sub-section under Chat: New Chat action & Conversation History */}
                <div className="flex flex-col mt-1 mb-2 pl-2 pr-1 gap-1">
                  {/* Recent Chats Section Header */}
                  <div
                    onClick={() => setIsChatsExpanded((prev) => !prev)}
                    className="flex items-center justify-between px-1.5 pt-1.5 pb-0.5 cursor-pointer group/header"
                    title={isChatsExpanded ? 'Collapse recent chats' : 'Expand recent chats'}
                  >
                    <span className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant/70 group-hover/header:text-on-surface transition-colors">
                      Recent Chats {conversations.length > 0 && `(${conversations.length})`}
                    </span>
                    <Icon
                      name={isChatsExpanded ? 'expand_less' : 'expand_more'}
                      size={14}
                      className="text-on-surface-variant/60 group-hover/header:text-on-surface transition-colors"
                    />
                  </div>

                  {/* Conversations Scrollable Sub-List */}
                  {isChatsExpanded && (
                    <div className="flex flex-col gap-0.5 max-h-[220px] overflow-y-auto pr-0.5">
                      {conversations.length === 0 ? (
                        <div className="px-2 py-2 text-[11px] text-on-surface-variant/60 italic">
                          No previous chats
                        </div>
                      ) : (
                        conversations.map((conv) => {
                          const isCurrent = isChatActive && activeConversationId === conv.id
                          return (
                            <div
                              key={conv.id}
                              onClick={() => {
                                setActiveConversationId(conv.id)
                                setActiveView('chat')
                              }}
                              className={`group/chat flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${isCurrent
                                ? 'bg-primary/15 text-primary font-medium dark:bg-white/[0.08] dark:text-primary'
                                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                                }`}
                              title={conv.title || 'Untitled Conversation'}
                            >
                              {editingConvId === conv.id ? (
                                <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editTitleInput}
                                    onChange={(e) => setEditTitleInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleSaveRename(conv.id)
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault()
                                        handleCancelRename()
                                      }
                                    }}
                                    onBlur={() => handleSaveRename(conv.id)}
                                    className="w-full bg-surface-container-highest px-1.5 py-0.5 rounded text-[11px] text-on-surface border border-primary/50 outline-none focus:ring-1 focus:ring-primary font-sans"
                                  />
                                  <button
                                    onClick={() => handleSaveRename(conv.id)}
                                    className="p-1 hover:bg-primary/20 text-primary rounded shrink-0"
                                    title="Save title"
                                  >
                                    <Icon name="check" size={12} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-col min-w-0 pr-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {streamingByConv[conv.id] && (
                                        <Icon
                                          name="progress_activity"
                                          size={11}
                                          className="animate-spin text-primary shrink-0"
                                        />
                                      )}
                                      <span className="truncate max-w-[130px] text-[11.5px] leading-tight">
                                        {conv.title || 'Untitled Chat'}
                                      </span>
                                    </div>
                                    <span className="text-[9.5px] text-on-surface-variant/60 font-mono">
                                      {streamingByConv[conv.id]
                                        ? 'Generating...'
                                        : formatRelativeTime(conv.updatedAt || conv.createdAt)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/chat:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => handleStartRename(e, conv.id, conv.title || 'Untitled Chat')}
                                      className="p-1 hover:bg-primary/20 hover:text-primary text-on-surface-variant/60 rounded transition-all shrink-0 cursor-pointer"
                                      title="Rename conversation"
                                    >
                                      <Icon name="edit" size={12} />
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        const confirmed = await showConfirm({
                                          title: 'Delete Conversation',
                                          message: `Are you sure you want to delete "${conv.title || 'Untitled Chat'}"? This conversation and its message history cannot be recovered.`,
                                          confirmText: 'Delete',
                                          cancelText: 'Cancel',
                                          variant: 'danger'
                                        })
                                        if (confirmed) {
                                          deleteConversation(conv.id)
                                        }
                                      }}
                                      className="p-1 hover:bg-error/20 hover:text-error text-on-surface-variant/60 rounded transition-all shrink-0 cursor-pointer"
                                      title="Delete conversation"
                                    >
                                      <Icon name="delete" size={12} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          }

          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`w-full flex items-center justify-between px-space-md py-2 rounded-lg transition-all text-left text-xs ${isActive
                ? 'bg-primary/10 text-on-surface dark:bg-white/[0.08] dark:text-on-surface font-semibold shadow-none border-l-2 border-primary pl-[14px]'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
            >
              <div className="flex items-center gap-space-md truncate">
                <Icon
                  name={view.icon}
                  size={17}
                  className={isActive ? 'text-primary' : 'text-on-surface-variant'}
                />
                <span className="truncate">{view.label}</span>
              </div>
              {view.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                >
                  {view.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Sidebar Footer: Settings */}
      <div className="px-space-md pt-space-md border-t border-border-subtle flex items-center justify-end shrink-0">
        <button
          onClick={() => setActiveView('settings')}
          className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title="Open Settings"
        >
          <Icon name="person" size={15} className="text-on-surface-variant hover:text-on-surface" />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
