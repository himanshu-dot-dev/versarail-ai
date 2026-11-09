import React, { useState, useEffect } from 'react'
import { useUiStore } from '../../app/useUiStore'
import Icon from '../common/Icon'

export const InspectorPanel: React.FC = () => {
  const {
    isInspectorOpen,
    toggleInspector,
    workspace,
    selectWorkspaceFolder
  } = useUiStore()
  const [workspaceTree, setWorkspaceTree] = useState<{ files: string[]; dirs: string[] } | null>(null)
  const [currentDir, setCurrentDir] = useState('.')
  const [fileFilter, setFileFilter] = useState('')
  const [copiedFile, setCopiedFile] = useState<string | null>(null)

  // Reset currentDir when workspace changes
  useEffect(() => {
    setCurrentDir('.')
  }, [workspace.path])

  const loadFiles = () => {
    if (workspace.path && window.electronApi?.inspectWorkspaceFiles) {
      window.electronApi
        .inspectWorkspaceFiles(currentDir)
        .then((res) => {
          if (res) setWorkspaceTree(res)
        })
        .catch(console.error)
    } else {
      setWorkspaceTree(null)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [workspace.path, currentDir])

  const handleOpenDir = (dirName: string) => {
    const next = currentDir === '.' ? dirName : `${currentDir}/${dirName}`
    setCurrentDir(next)
  }

  const handleGoUp = () => {
    if (currentDir === '.') return
    const parts = currentDir.split('/')
    parts.pop()
    setCurrentDir(parts.length > 0 ? parts.join('/') : '.')
  }

  const handleNavigateBreadcrumb = (index: number, segments: string[]) => {
    if (index === -1) {
      setCurrentDir('.')
    } else {
      const target = segments.slice(0, index + 1).join('/')
      setCurrentDir(target)
    }
  }

  const handleCopyFile = (fileName: string) => {
    const fullRelative = currentDir === '.' ? fileName : `${currentDir}/${fileName}`
    navigator.clipboard.writeText(fullRelative)
    setCopiedFile(fileName)
    setTimeout(() => setCopiedFile(null), 1500)
  }

  const query = fileFilter.toLowerCase().trim()
  const filteredDirs = workspaceTree?.dirs?.filter((d) => d.toLowerCase().includes(query)) || []
  const filteredFiles = workspaceTree?.files?.filter((f) => f.toLowerCase().includes(query)) || []

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

  const pathSegments = currentDir === '.' ? [] : currentDir.split('/')

  const getFileIconProps = (fileName: string) => {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return { icon: 'code', color: 'text-tertiary' }
    }
    if (fileName.endsWith('.json') || fileName.endsWith('.yml') || fileName.endsWith('.yaml') || fileName.endsWith('.toml')) {
      return { icon: 'code', color: 'text-amber-400' }
    }
    if (fileName.endsWith('.css') || fileName.endsWith('.scss')) {
      return { icon: 'palette', color: 'text-pink-400' }
    }
    if (fileName.endsWith('.html')) {
      return { icon: 'code', color: 'text-orange-400' }
    }
    if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
      return { icon: 'description', color: 'text-on-surface-variant' }
    }
    return { icon: 'description', color: 'text-on-surface-variant' }
  }

  return (
    <div className="w-72 bg-surface-container-lowest flex flex-col h-full border-l border-border-subtle shrink-0 select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-space-md py-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface">
          <Icon name="description" size={15} className="text-primary" />
          <span>Workspace Files</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={loadFiles}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-container transition-colors cursor-pointer"
            title="Refresh Files"
          >
            <Icon name="refresh" size={13} />
          </button>
          <button
            onClick={toggleInspector}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-container transition-colors cursor-pointer"
            title="Collapse Panel"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-space-md text-xs">
        <div className="flex flex-col gap-space-xs">
          {workspaceTree && (workspaceTree.dirs.length > 0 || workspaceTree.files.length > 0) ? (
            <>
              {/* Interactive Path Breadcrumbs */}
              <div className="flex items-center flex-wrap gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface font-mono text-[11px] mb-1.5 border border-outline-variant">
                <button
                  onClick={() => handleNavigateBreadcrumb(-1, [])}
                  className={`hover:text-primary transition-colors cursor-pointer truncate max-w-[90px] ${
                    currentDir === '.' ? 'font-semibold text-primary' : 'text-on-surface-variant'
                  }`}
                  title={workspace.path || 'Root'}
                >
                  {workspace.name || 'root'}
                </button>

                {pathSegments.map((segment, idx) => {
                  const isLast = idx === pathSegments.length - 1
                  return (
                    <React.Fragment key={idx}>
                      <span className="text-on-surface-variant/40 select-none">/</span>
                      <button
                        onClick={() => handleNavigateBreadcrumb(idx, pathSegments)}
                        className={`hover:text-primary transition-colors cursor-pointer truncate max-w-[80px] ${
                          isLast ? 'font-semibold text-primary' : 'text-on-surface-variant'
                        }`}
                        title={segment}
                      >
                        {segment}
                      </button>
                    </React.Fragment>
                  )
                })}
              </div>

              {/* File Search Filter Input */}
              <div className="relative mb-1">
                <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value)}
                  placeholder="Filter files..."
                  className="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/60 pl-8 pr-6 py-1 rounded-lg text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant"
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

              {/* Navigate Up Folder button when inside subdirectory */}
              {currentDir !== '.' && (
                <div
                  onClick={handleGoUp}
                  className="flex items-center gap-1.5 px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-primary text-[11px] font-mono mb-1 transition-colors group"
                  title="Go up one folder level"
                >
                  <Icon name="arrow_upward" size={13} className="group-hover:-translate-y-0.5 transition-transform" />
                  <span>.. (Up one level)</span>
                </div>
              )}

              {/* Directory list */}
              {filteredDirs.map((dir) => (
                <div
                  key={`d-${dir}`}
                  onClick={() => handleOpenDir(dir)}
                  className="flex items-center justify-between gap-space-sm px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface group transition-colors"
                  title={`Open folder "${dir}"`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon name="folder" size={14} className="text-primary shrink-0" />
                    <span className="font-mono text-[11px] truncate flex-1">{dir}</span>
                  </div>
                  <Icon name="chevron_right" size={13} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}

              {/* File list */}
              {filteredFiles.map((file) => {
                const iconProps = getFileIconProps(file)
                const isCopied = copiedFile === file
                return (
                  <div
                    key={`f-${file}`}
                    onClick={() => handleCopyFile(file)}
                    className="flex items-center justify-between px-space-sm py-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface group transition-colors"
                    title={`Click to copy relative path "${file}"`}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <Icon
                        name={iconProps.icon}
                        size={14}
                        className={`${iconProps.color} shrink-0`}
                      />
                      <span className="truncate font-mono text-[11px]">{file}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono transition-opacity shrink-0 ml-1 ${
                        isCopied ? 'text-emerald-400 opacity-100 font-semibold' : 'text-primary opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isCopied ? 'Copied!' : 'Copy'}
                    </span>
                  </div>
                )
              })}

              {filteredDirs.length === 0 && filteredFiles.length === 0 && (
                <div className="py-6 text-center text-on-surface-variant text-[11px]">
                  No files matching "{fileFilter}"
                </div>
              )}
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
      </div>
    </div>
  )
}
