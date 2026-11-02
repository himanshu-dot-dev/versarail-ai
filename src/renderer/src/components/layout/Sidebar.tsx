import React, { useState } from 'react'
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
    activeConversationId,
    setActiveConversationId,
    conversations,
    startNewChat,
    deleteConversation
  } = useUiStore()

  const [isChatsExpanded, setIsChatsExpanded] = useState(true)
  const views = viewRegistry.getAll()

  return (
    <aside className="w-64 h-full bg-surface-container-lowest shrink-0 flex flex-col py-space-md border-r border-border-subtle select-none">
      {/* Active Project Card */}
      <div className="px-space-md mb-space-md">
        <div
          onClick={selectWorkspaceFolder}
          className="flex items-center justify-between bg-surface-container px-space-md py-space-sm rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors group border border-outline-variant hover:border-outline"
          title="Click to open or switch project folder"
        >
          <div className="flex items-center gap-space-sm min-w-0">
            <Icon name="folder_open" size={18} className="text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-on-surface-variant uppercase font-mono">Active Project</span>
              <span className="text-body-sm text-on-surface font-medium truncate max-w-[130px]">
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
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Icon
                                  name="chat_bubble_outline"
                                  size={13}
                                  className={isCurrent ? 'text-primary shrink-0' : 'text-on-surface-variant/60 shrink-0'}
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate max-w-[130px] text-[11.5px] leading-tight">
                                    {conv.title || 'Untitled Chat'}
                                  </span>
                                  <span className="text-[9.5px] text-on-surface-variant/60 font-mono">
                                    {formatRelativeTime(conv.updatedAt || conv.createdAt)}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm('Delete this conversation?')) {
                                    deleteConversation(conv.id)
                                  }
                                }}
                                className="opacity-0 group-hover/chat:opacity-100 p-1 hover:bg-error/20 hover:text-error text-on-surface-variant/60 rounded transition-all shrink-0 cursor-pointer"
                                title="Delete conversation"
                              >
                                <Icon name="delete" size={13} />
                              </button>
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
