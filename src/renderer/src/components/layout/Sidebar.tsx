import React from 'react'
import { useUiStore } from '../../app/useUiStore'
import { viewRegistry } from '../../app/viewRegistry'
import Icon from '../common/Icon'

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, workspace, selectWorkspaceFolder, connectedModel } =
    useUiStore()

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
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`w-full flex items-center justify-between px-space-md py-2 rounded-lg transition-all text-left text-xs ${
                isActive
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
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive
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

      {/* Sidebar Footer: Connected Model Telemetry & Settings */}
      <div className="px-space-md pt-space-md border-t border-border-subtle flex items-center justify-between shrink-0">
        <div
          className="flex items-center gap-space-sm min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setActiveView('ai-providers')}
          title="Click to manage AI Providers"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              connectedModel.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-error'
            }`}
          />
          <span className="text-[11px] text-on-surface-variant truncate font-mono max-w-[150px]">
            {connectedModel.name}
          </span>
        </div>

        <button
          onClick={() => setActiveView('settings')}
          className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0 transition-colors"
          title="Open Settings"
        >
          <Icon name="person" size={15} className="text-on-surface-variant hover:text-on-surface" />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
