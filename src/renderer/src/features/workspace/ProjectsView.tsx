import React from 'react'
import Icon from '../../components/common/Icon'
import { useUiStore } from '../../app/useUiStore'

interface RecentProject {
  id: string
  name: string
  path: string
  lastOpened: string
  filesCount: number
  activeBranch: string
  isCurrent: boolean
}

export const ProjectsView: React.FC = () => {
  const { workspace, setWorkspace, selectWorkspaceFolder, setActiveView } = useUiStore()

  // Dynamically resolve recent projects only from the real active workspace
  const projects: RecentProject[] = workspace.path
    ? [
        {
          id: 'proj-current',
          name: workspace.name || 'Workspace',
          path: workspace.path,
          lastOpened: 'Active Now',
          filesCount: 0,
          activeBranch: 'local',
          isCurrent: true
        }
      ]
    : []

  const handleOpenFolder = async () => {
    await selectWorkspaceFolder()
  }

  const handleSwitchProject = (proj: RecentProject) => {
    setWorkspace({
      path: proj.path,
      name: proj.name
    })
    setActiveView('chat')
  }

  const hasWorkspace = Boolean(workspace.path)

  return (
    <div className="flex flex-col w-full p-space-xl gap-space-xl select-none font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <span className="text-label-sm text-primary uppercase tracking-wider text-[11px] font-mono">
              Workspaces &amp; Environments
            </span>
            <span className="text-label-sm text-on-surface-variant font-mono">/</span>
            <span className="text-label-sm text-on-surface-variant font-mono text-[11px]">Local Filesystem</span>
          </div>
          <h1 className="font-headline-xl text-on-surface text-2xl font-bold tracking-tight">
            Projects
          </h1>
          <p className="font-body-md text-on-surface-variant text-xs max-w-2xl mt-0.5">
            Manage local code repositories, configure per-project agent permission boundaries, and switch active workspaces.
          </p>
        </div>

        <button
          onClick={handleOpenFolder}
          className="flex items-center gap-space-sm px-space-lg py-space-sm bg-primary text-on-primary hover:opacity-90 rounded-xl transition-all shadow-md font-medium text-xs self-start md:self-auto cursor-pointer"
        >
          <Icon name="folder_open" size={18} />
          <span>Open New Folder...</span>
        </button>
      </div>

      {/* Current Workspace Card */}
      <div className="bg-surface-container-low rounded-xl p-space-xl border border-primary/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${hasWorkspace ? 'bg-primary' : 'bg-outline-variant'}`} />
        <div className="flex items-center gap-space-lg min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon name={hasWorkspace ? 'folder_special' : 'folder_open'} size={26} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-md text-on-surface font-semibold text-base truncate">
                {hasWorkspace ? workspace.name : 'No Workspace Open'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${
                  hasWorkspace
                    ? 'bg-tertiary-container/30 text-tertiary'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {hasWorkspace ? 'ACTIVE WORKSPACE' : 'AWAITING WORKSPACE'}
              </span>
            </div>
            <span className="font-body-sm text-on-surface-variant font-mono text-xs truncate mt-0.5">
              {hasWorkspace
                ? workspace.path
                : 'No project folder selected. Open a folder to start analyzing code.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-md shrink-0">
          {hasWorkspace ? (
            <>
              <button
                onClick={() => setActiveView('file-explorer')}
                className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors border border-outline-variant/30"
              >
                <Icon name="description" size={16} />
                Explore Files
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary text-xs font-medium transition-colors"
              >
                <Icon name="chat" size={16} />
                Start Chat
              </button>
            </>
          ) : (
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-primary text-on-primary text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Icon name="folder_open" size={16} />
              Open Folder
            </button>
          )}
        </div>
      </div>

      {/* Recent Projects List */}
      <div className="bg-surface-container-low rounded-xl p-space-xl border border-outline-variant/20 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
          <h2 className="font-headline-md text-on-surface font-semibold text-sm">
            Recent Workspaces
          </h2>
          <span className="text-label-sm text-on-surface-variant font-mono text-[11px]">
            {projects.length} Total
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-space-xl text-center text-on-surface-variant gap-space-sm py-12 border border-dashed border-outline-variant/30 rounded-xl">
            <Icon name="folder_open" size={32} className="text-outline" />
            <span className="font-headline-sm text-on-surface font-semibold text-xs">No Recent Workspaces</span>
            <p className="text-[11px] text-on-surface-variant max-w-sm">
              Open a local code repository to manage per-project permissions and start agent sessions.
            </p>
            <button
              onClick={handleOpenFolder}
              className="mt-2 flex items-center gap-space-xs px-space-md py-space-xs bg-primary text-on-primary rounded-lg text-xs font-medium hover:opacity-90"
            >
              <Icon name="folder_open" size={14} />
              <span>Open Folder</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-space-sm">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleSwitchProject(proj)}
                className="flex items-center justify-between p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer group border border-outline-variant/10"
              >
                <div className="flex items-center gap-space-md min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name="folder" size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-space-sm">
                      <span className="font-headline-sm text-on-surface font-medium text-xs group-hover:text-primary transition-colors">
                        {proj.name}
                      </span>
                      {proj.isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-tertiary-container/30 text-tertiary font-mono">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-on-surface-variant font-mono text-[11px] truncate">
                      {proj.path}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xl text-xs font-mono text-on-surface-variant shrink-0">
                  <span className="text-[11px]">{proj.lastOpened}</span>
                  <Icon
                    name="chevron_right"
                    size={18}
                    className="text-on-surface-variant group-hover:text-on-surface transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectsView

