import React, { useState, useEffect } from 'react'
import { useUiStore, InspectorTab } from '../../app/useUiStore'
import Icon from '../common/Icon'

export const InspectorPanel: React.FC = () => {
  const {
    inspectorTab,
    setInspectorTab,
    isInspectorOpen,
    toggleInspector,
    workspace,
    selectWorkspaceFolder
  } = useUiStore()
  const [workspaceTree, setWorkspaceTree] = useState<{ files: string[]; dirs: string[] } | null>(null)
  const [fileFilter, setFileFilter] = useState('')
  const [copiedFile, setCopiedFile] = useState<string | null>(null)

  useEffect(() => {
    if (workspace.path && window.electronApi?.inspectWorkspaceFiles) {
      window.electronApi
        .inspectWorkspaceFiles('.')
        .then((res) => {
          if (res) setWorkspaceTree(res)
        })
        .catch(console.error)
    } else {
      setWorkspaceTree(null)
    }
  }, [workspace.path])

  const handleCopyFile = (fileName: string) => {
    navigator.clipboard.writeText(fileName)
    setCopiedFile(fileName)
    setTimeout(() => setCopiedFile(null), 1500)
  }

  const query = fileFilter.toLowerCase().trim()
  const filteredDirs = workspaceTree?.dirs.filter((d) => d.toLowerCase().includes(query)) || []
  const filteredFiles = workspaceTree?.files.filter((f) => f.toLowerCase().includes(query)) || []

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
                <div className="flex items-center justify-between px-space-sm py-1.5 rounded-lg bg-surface-container text-on-surface font-medium font-mono text-[11px] mb-1.5 border border-outline-variant">
                  <div className="flex items-center gap-1.5 truncate">
                    <Icon name="folder_open" size={15} className="text-primary shrink-0" />
                    <span className="truncate">{workspace.name || 'workspace'}</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-mono shrink-0">
                    {workspaceTree.files.length} files
                  </span>
                </div>

                {/* File Search Filter Input */}
                <div className="relative mb-1">
                  <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    placeholder="Filter project files..."
                    className="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/60 pl-8 pr-2 py-1 rounded-lg text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant"
                  />
                  {fileFilter && (
                    <button
                      onClick={() => setFileFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      <Icon name="close" size={11} />
                    </button>
                  )}
                </div>

                {/* Directory list */}
                {filteredDirs.map((dir) => (
                  <div
                    key={`d-${dir}`}
                    className="flex items-center gap-space-sm px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface group"
                  >
                    <Icon name="folder" size={14} className="text-primary shrink-0" />
                    <span className="font-mono text-[11px] truncate flex-1">{dir}</span>
                  </div>
                ))}

                {/* File list */}
                {filteredFiles.map((file) => (
                  <div
                    key={`f-${file}`}
                    onClick={() => handleCopyFile(file)}
                    className="flex items-center justify-between px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface group transition-colors"
                    title={`Click to copy "${file}"`}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <Icon
                        name={file.endsWith('.json') ? 'code' : file.endsWith('.ts') || file.endsWith('.tsx') ? 'file_code' : 'description'}
                        size={14}
                        className={file === 'package.json' ? 'text-primary shrink-0' : 'text-tertiary shrink-0'}
                      />
                      <span className="truncate font-mono text-[11px]">{file}</span>
                    </div>
                    <span className="text-[10px] text-primary font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                      {copiedFile === file ? 'Copied!' : 'Copy'}
                    </span>
                  </div>
                ))}

                {filteredDirs.length === 0 && filteredFiles.length === 0 && (
                  <div className="py-6 text-center text-on-surface-variant text-[11px]">
                    No files matching "{fileFilter}"
                  </div>
                )}

                <button
                  onClick={selectWorkspaceFolder}
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface text-[11px] font-mono transition-colors cursor-pointer"
                >
                  <Icon name="folder_open" size={13} className="text-primary" />
                  <span>Switch Workspace Folder...</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-space-xl text-center text-on-surface-variant gap-2 my-auto">
                <Icon name="folder_open" size={28} className="text-on-surface-variant/60" />
                <span className="text-xs text-on-surface font-medium">No Workspace Opened</span>
                <span className="text-[11px] text-on-surface-variant">
                  Open a project folder to inspect directory files alongside your chat.
                </span>
                <button
                  onClick={selectWorkspaceFolder}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  <Icon name="folder_open" size={14} />
                  <span>Open Folder</span>
                </button>
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
