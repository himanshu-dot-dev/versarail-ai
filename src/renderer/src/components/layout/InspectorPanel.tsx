import React, { useState, useEffect } from 'react'
import { useUiStore, InspectorTab } from '../../app/useUiStore'
import Icon from '../common/Icon'

export const InspectorPanel: React.FC = () => {
  const { inspectorTab, setInspectorTab, isInspectorOpen, toggleInspector, workspace } = useUiStore()
  const [workspaceTree, setWorkspaceTree] = useState<{ files: string[]; dirs: string[] } | null>(null)

  useEffect(() => {
    if (workspace.path && window.electronApi?.inspectWorkspaceFiles) {
      window.electronApi
        .inspectWorkspaceFiles('.')
        .then((res) => {
          if (res) setWorkspaceTree(res)
        })
        .catch(console.error)
    }
  }, [workspace.path])

  if (!isInspectorOpen) {
    return (
      <button
        onClick={toggleInspector}
        className="absolute right-3 top-3 z-30 p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors border border-outline-variant/30 shadow-md"
        title="Open Inspector Panel"
      >
        <Icon name="dock_to_left" size={16} />
      </button>
    )
  }

  return (
    <div className="w-72 bg-surface-container-lowest flex flex-col h-full border-l border-surface-container-high/60 shrink-0 select-none">
      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between border-b border-surface-container-high px-space-md pt-2 pb-1">
        <div className="flex items-center gap-space-xs flex-1">
          {(['files', 'activity', 'changes'] as InspectorTab[]).map((tab) => {
            const isActive = inspectorTab === tab
            return (
              <button
                key={tab}
                onClick={() => setInspectorTab(tab)}
                className={`pb-1 text-center text-xs font-medium capitalize border-b-2 transition-colors px-2 ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-on-surface-variant hover:text-on-surface border-transparent'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <button
          onClick={toggleInspector}
          className="p-1 text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-container transition-colors"
          title="Collapse Inspector"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-space-md text-xs">
        {/* Tab 1: Files */}
        {inspectorTab === 'files' && (
          <div className="flex flex-col gap-space-xs">
            {workspaceTree && (workspaceTree.dirs.length > 0 || workspaceTree.files.length > 0) ? (
              <>
                <div className="flex items-center gap-space-sm px-space-sm py-1 rounded bg-surface-container text-on-surface font-medium font-mono text-[11px] mb-1">
                  <Icon name="folder_open" size={15} className="text-primary shrink-0" />
                  <span className="truncate">{workspace.name || 'workspace'}</span>
                </div>

                {workspaceTree.dirs.map((dir) => (
                  <div
                    key={`d-${dir}`}
                    className="flex items-center gap-space-sm px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface"
                  >
                    <Icon name="folder" size={14} className="text-primary shrink-0" />
                    <span className="font-mono text-[11px] truncate">{dir}</span>
                  </div>
                ))}

                {workspaceTree.files.map((file) => (
                  <div
                    key={`f-${file}`}
                    className="flex items-center justify-between px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Icon
                        name={file === 'package.json' ? 'cloud_upload' : 'description'}
                        size={14}
                        className={file === 'package.json' ? 'text-primary shrink-0' : 'text-tertiary shrink-0'}
                      />
                      <span className="truncate font-mono text-[11px]">{file}</span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center gap-space-sm px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface">
                  <Icon name="folder_open" size={15} className="text-primary shrink-0" />
                  <span className="font-medium font-mono text-[11px]">src</span>
                </div>
                <div className="flex flex-col gap-0.5 pl-4">
                  <div className="flex items-center gap-space-sm px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface">
                    <Icon name="folder" size={15} className="text-primary shrink-0" />
                    <span className="font-mono text-[11px]">auth</span>
                  </div>
                  <div className="flex flex-col gap-0.5 pl-4">
                    <div className="flex items-center justify-between px-space-sm py-1 rounded bg-surface-container text-on-surface">
                      <div className="flex items-center gap-1.5 truncate">
                        <Icon name="description" size={14} className="text-tertiary shrink-0" />
                        <span className="truncate font-mono text-[11px]">authService.ts</span>
                      </div>
                      <span className="text-[10px] text-tertiary font-mono font-bold">M</span>
                    </div>
                    <div className="flex items-center justify-between px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface">
                      <div className="flex items-center gap-1.5 truncate">
                        <Icon name="description" size={14} className="text-tertiary shrink-0" />
                        <span className="truncate font-mono text-[11px]">authService.test.ts</span>
                      </div>
                      <span className="text-[10px] text-primary font-mono font-bold">N</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface">
                    <div className="flex items-center gap-1.5">
                      <Icon name="description" size={14} className="shrink-0" />
                      <span className="font-mono text-[11px]">index.ts</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface mt-2">
                  <div className="flex items-center gap-1.5">
                    <Icon name="cloud_upload" size={14} className="shrink-0" />
                    <span className="font-mono text-[11px]">package.json</span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface">
                  <div className="flex items-center gap-1.5">
                    <Icon name="description" size={14} className="shrink-0" />
                    <span className="font-mono text-[11px]">README.md</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Activity */}
        {inspectorTab === 'activity' && (
          <div className="flex flex-col gap-space-md font-sans">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-on-surface-variant font-mono">10:42:01 AM</span>
              <p className="text-on-surface text-[11px]">User submitted prompt</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-primary font-mono">10:42:02 AM</span>
              <p className="text-on-surface text-[11px]">Gemini 2.5 Flash initialized workflow</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-tertiary font-mono">10:42:03 AM</span>
              <p className="text-on-surface text-[11px]">Tool call executed: list_directory</p>
            </div>
          </div>
        )}

        {/* Tab 3: Changes */}
        {inspectorTab === 'changes' && (
          <div className="flex flex-col gap-space-md font-sans">
            <div className="p-space-sm rounded-lg bg-surface-container border border-outline-variant/30">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] font-semibold text-on-surface">authService.ts</span>
                <span className="text-[10px] text-tertiary font-mono">+12 / -4</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Added JWT session expiration check</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
