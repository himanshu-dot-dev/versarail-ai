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
        className="absolute right-3 top-3 z-30 p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors border border-outline-variant shadow-md"
        title="Open Inspector Panel"
      >
        <Icon name="dock_to_left" size={16} />
      </button>
    )
  }

  return (
    <div className="w-72 bg-surface-container-lowest flex flex-col h-full border-l border-border-subtle shrink-0 select-none">
      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-space-md pt-2 pb-1">
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
              <div className="flex flex-col items-center justify-center p-space-xl text-center text-on-surface-variant gap-2 my-auto">
                <Icon name="folder_open" size={28} className="text-on-surface-variant/60" />
                <span className="text-xs text-on-surface font-medium">No Workspace Opened</span>
                <span className="text-[11px] text-on-surface-variant">
                  Open a project folder to explore directory files.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Activity */}
        {inspectorTab === 'activity' && (
          <div className="flex-1 flex flex-col items-center justify-center p-space-xl text-center text-on-surface-variant gap-2 my-auto">
            <Icon name="bolt" size={28} className="text-on-surface-variant/60" />
            <span className="text-xs text-on-surface font-medium">No Activity in Session</span>
            <span className="text-[11px] text-on-surface-variant max-w-[200px]">
              Agent steps, tool executions, and model reasoning will stream here.
            </span>
          </div>
        )}

        {/* Tab 3: Changes */}
        {inspectorTab === 'changes' && (
          <div className="flex-1 flex flex-col items-center justify-center p-space-xl text-center text-on-surface-variant gap-2 my-auto">
            <Icon name="difference" size={28} className="text-on-surface-variant/60" />
            <span className="text-xs text-on-surface font-medium">No File Changes</span>
            <span className="text-[11px] text-on-surface-variant max-w-[200px]">
              Proposed file edits and additions will appear here for review before touching disk.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
