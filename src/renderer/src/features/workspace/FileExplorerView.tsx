import React, { useState, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { useUiStore } from '../../app/useUiStore'

interface FileItem {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  size?: string
  modified: string
  ext?: string
}

const defaultFiles: FileItem[] = [
  { id: '1', name: 'src', path: 'src', type: 'folder', modified: 'Folder' },
  { id: '2', name: 'docs', path: 'docs', type: 'folder', modified: 'Folder' },
  { id: '3', name: 'tests', path: 'tests', type: 'folder', modified: 'Folder' },
  { id: '4', name: 'package.json', path: 'package.json', type: 'file', size: '2.4 KB', modified: 'Config', ext: 'json' },
  { id: '5', name: 'tsconfig.json', path: 'tsconfig.json', type: 'file', size: '1.1 KB', modified: 'Config', ext: 'json' },
  { id: '6', name: 'electron.vite.config.ts', path: 'electron.vite.config.ts', type: 'file', size: '1.8 KB', modified: 'Config', ext: 'ts' },
  { id: '7', name: 'tailwind.config.js', path: 'tailwind.config.js', type: 'file', size: '2.1 KB', modified: 'Config', ext: 'js' },
  { id: '8', name: 'README.md', path: 'README.md', type: 'file', size: '4.2 KB', modified: 'Docs', ext: 'md' }
]

export const FileExplorerView: React.FC = () => {
  const { workspace, setActiveView } = useUiStore()
  const [fileList, setFileList] = useState<FileItem[]>(defaultFiles)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(defaultFiles[3])

  useEffect(() => {
    if (workspace.path && window.electronApi?.inspectWorkspaceFiles) {
      window.electronApi
        .inspectWorkspaceFiles('.')
        .then((result) => {
          if (result && (result.dirs.length > 0 || result.files.length > 0)) {
            const items: FileItem[] = []
            result.dirs.forEach((d, idx) => {
              items.push({
                id: `dir-${idx}`,
                name: d,
                path: d,
                type: 'folder',
                modified: 'Directory'
              })
            })
            result.files.forEach((f, idx) => {
              const ext = f.includes('.') ? f.split('.').pop() : undefined
              items.push({
                id: `file-${idx}`,
                name: f,
                path: f,
                type: 'file',
                ext,
                modified: 'Workspace File'
              })
            })
            setFileList(items)
            if (items.length > 0) {
              setSelectedFile(items[0])
            }
          }
        })
        .catch(console.error)
    }
  }, [workspace.path])

  const filteredFiles = fileList.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col w-full h-[calc(100vh-2.5rem)] p-space-xl gap-space-lg select-none font-sans overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md shrink-0">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <span className="text-label-sm text-primary uppercase tracking-wider text-[11px] font-mono">
              Workspace Filesystem
            </span>
            <span className="text-label-sm text-on-surface-variant font-mono">/</span>
            <span className="text-label-sm text-on-surface-variant font-mono text-[11px]">
              {workspace.name || 'versa-rail-core'}
            </span>
          </div>
          <h1 className="font-headline-xl text-on-surface text-2xl font-bold tracking-tight">
            File Explorer
          </h1>
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files in workspace..."
            className="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant pl-9 pr-3 py-1.5 rounded-lg text-xs font-body-md focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/20"
          />
        </div>
      </div>

      {/* Explorer Workspace Split */}
      <div className="flex-1 flex gap-space-lg min-h-0">
        {/* File List */}
        <div className="flex-1 bg-surface-container-low rounded-xl border border-outline-variant/20 overflow-y-auto p-space-md flex flex-col gap-1">
          <div className="flex items-center gap-2 px-space-md py-space-sm text-on-surface-variant font-mono text-[11px] border-b border-surface-container-high mb-1">
            <Icon name="folder_open" size={16} className="text-primary" />
            <span className="truncate">{workspace.path || 'No Workspace Open'}</span>
          </div>

          {filteredFiles.map((item) => {
            const isSelected = selectedFile?.id === item.id
            return (
              <div
                key={item.id}
                onClick={() => setSelectedFile(item)}
                className={`flex items-center justify-between px-space-md py-space-sm rounded-lg cursor-pointer transition-colors text-xs ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container font-medium'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <Icon
                    name={item.type === 'folder' ? 'folder' : 'description'}
                    size={16}
                    className={isSelected ? 'text-on-primary-container' : item.type === 'folder' ? 'text-primary' : 'text-tertiary'}
                  />
                  <span className="truncate">{item.name}</span>
                </div>

                <div className="flex items-center gap-space-md font-mono text-[11px] shrink-0">
                  {item.size && <span>{item.size}</span>}
                  <span>{item.modified}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected File Details Pane */}
        <div className="w-80 bg-surface-container-low rounded-xl border border-outline-variant/20 p-space-lg flex flex-col gap-space-md shrink-0">
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
            <h3 className="font-headline-sm text-on-surface font-semibold text-xs">File Inspector</h3>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono text-[10px]">
              {selectedFile?.ext?.toUpperCase() || 'NODE'}
            </span>
          </div>

          {selectedFile ? (
            <div className="flex flex-col gap-space-md text-xs">
              <div className="flex items-center gap-space-md p-space-md bg-surface-container rounded-lg">
                <Icon
                  name={selectedFile.type === 'folder' ? 'folder' : 'description'}
                  size={24}
                  className="text-primary shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-on-surface truncate">{selectedFile.name}</span>
                  <span className="text-[11px] text-on-surface-variant font-mono truncate">
                    {selectedFile.path}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 font-mono text-[11px]">
                <div className="flex justify-between py-1 border-b border-surface-container-high/60">
                  <span className="text-on-surface-variant">Type</span>
                  <span className="text-on-surface uppercase">{selectedFile.type}</span>
                </div>
                {selectedFile.size && (
                  <div className="flex justify-between py-1 border-b border-surface-container-high/60">
                    <span className="text-on-surface-variant">Size</span>
                    <span className="text-on-surface">{selectedFile.size}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-on-surface-variant">Modified</span>
                  <span className="text-on-surface">{selectedFile.modified}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveView('chat')}
                className="mt-auto flex items-center justify-center gap-space-sm w-full py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity font-medium text-xs shadow-sm"
              >
                <Icon name="chat" size={16} />
                Ask AI Agent About File
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-xs">
              Select a file to inspect metadata
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileExplorerView
