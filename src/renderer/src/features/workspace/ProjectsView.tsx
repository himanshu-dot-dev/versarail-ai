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

  const projects: RecentProject[] = [
    {
      id: 'proj-1',
      name: workspace.name || 'ai-agent-harness',
      path: workspace.path || 'C:\\Users\\hs521\\Desktop\\Devlopment\\ai-agent-harness',
      lastOpened: 'Active Now',
      filesCount: 142,
      activeBranch: 'development',
      isCurrent: true
    },
    {
      id: 'proj-2',
      name: 'rail-router-ui',
      path: 'C:\\Users\\hs521\\Desktop\\Devlopment\\rail-router-ui',
      lastOpened: '2 days ago',
      filesCount: 84,
      activeBranch: 'main',
      isCurrent: false
    },
    {
      id: 'proj-3',
      name: 'telemetry-daemon',
      path: 'C:\\Users\\hs521\\Desktop\\Devlopment\\telemetry-daemon',
      lastOpened: 'Last week',
      filesCount: 38,
      activeBranch: 'feat/metrics',
      isCurrent: false
    }
  ]

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
          className="flex items-center gap-space-sm px-space-lg py-space-sm bg-primary text-on-primary hover:opacity-90 rounded-xl transition-all shadow-md font-medium text-xs self-start md:self-auto"
        >
          <Icon name="folder_open" size={18} />
          Open New Folder...
        </button>
      </div>

      {/* Current Workspace Card */}
      <div className="bg-surface-container-low rounded-xl p-space-xl border border-primary/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
        <div className="flex items-center gap-space-lg min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon name="folder_special" size={26} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-md text-on-surface font-semibold text-base truncate">
                {workspace.name || 'ai-agent-harness'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-container/30 text-tertiary font-mono text-[10px]">
                ACTIVE WORKSPACE
              </span>
            </div>
            <span className="font-body-sm text-on-surface-variant font-mono text-xs truncate mt-0.5">
              {workspace.path || 'C:\\Users\\hs521\\Desktop\\Devlopment\\ai-agent-harness'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-md shrink-0">
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
                <div className="hidden sm:flex items-center gap-1 text-[11px]">
                  <Icon name="commit" size={14} className="text-secondary" />
                  <span>{proj.activeBranch}</span>
                </div>
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
      </div>
    </div>
  )
}

export default ProjectsView

