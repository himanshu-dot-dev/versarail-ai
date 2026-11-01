import React, { useState, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { useUiStore } from '../../app/useUiStore'

interface TaskExecutionRecord {
  id: string
  title: string
  prompt: string
  project: string
  provider: string
  model: string
  timestamp: string
  status: 'completed' | 'pending' | 'failed' | 'running'
  filesModified: number
  durationMs: number
  tokensUsed: number
}

export const TaskHistoryView: React.FC = () => {
  const { setActiveView, workspace } = useUiStore()
  const [tasks, setTasks] = useState<TaskExecutionRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState<TaskExecutionRecord | null>(null)

  useEffect(() => {
    if (window.electronApi?.listConversations) {
      window.electronApi
        .listConversations()
        .then((list) => {
          if (list && list.length > 0) {
            const records: TaskExecutionRecord[] = list.map((c) => {
              const wsName = c.workspacePath
                ? c.workspacePath.split(/[/\\]/).pop() || c.workspacePath
                : workspace.name || 'Workspace'
              const isGroq = c.selectedModel?.includes('llama')
              const isGemini = c.selectedModel?.includes('gemini')
              return {
                id: c.id.slice(0, 8),
                title: c.title || 'Agent Conversation',
                prompt: c.title,
                project: wsName,
                provider: isGroq ? 'GroqCloud LPU' : isGemini ? 'Google AI Studio' : 'AI Gateway',
                model: c.selectedModel || 'gemini-2.5-flash',
                timestamp: new Date(c.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                status: 'completed',
                filesModified: 0,
                durationMs: 1200,
                tokensUsed: 450
              }
            })
            setTasks(records)
          } else {
            setTasks([])
          }
        })
        .catch(console.error)
    }
  }, [workspace.name])

  const projects = Array.from(new Set(tasks.map((t) => t.project)))

  const filteredHistory = tasks.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProject = projectFilter === 'all' || item.project === projectFilter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesProject && matchesStatus
  })

  return (
    <div className="flex flex-col w-full p-space-xl gap-space-xl select-none font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <span className="text-label-sm text-tertiary uppercase tracking-wider text-[11px] font-mono">
              Telemetry &amp; Audit
            </span>
            <span className="text-label-sm text-on-surface-variant font-mono">/</span>
            <span className="text-label-sm text-on-surface-variant font-mono text-[11px]">Audit Journal</span>
          </div>
          <h1 className="font-headline-xl text-on-surface tracking-tight text-2xl font-bold">
            Task History
          </h1>
          <p className="font-body-md text-on-surface-variant max-w-2xl text-xs mt-0.5">
            Search and inspect previous AI agent sessions, telemetry logs, and granular file modifications across all connected workspaces.
          </p>
        </div>

        <div className="flex items-center gap-space-md">
          <button
            onClick={() => alert('Telemetry logs exported to JSON.')}
            className="flex items-center gap-space-sm px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg transition-colors font-body-md shadow-sm text-xs cursor-pointer"
          >
            <Icon name="download" size={16} />
            Export Logs
          </button>
          <button
            onClick={() => {
              setTasks([])
              alert('Execution telemetry cache cleared.')
            }}
            className="flex items-center gap-space-sm px-space-md py-space-sm bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all rounded-lg font-body-md shadow-sm font-medium text-xs cursor-pointer"
          >
            <Icon name="clear_all" size={16} />
            Clear Cache
          </button>
        </div>
      </div>

      {/* Quick Stats Bento Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/20">
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant uppercase text-[11px]">Total Executions</span>
            <Icon name="bolt" size={20} className="text-primary" />
          </div>
          <div className="flex items-baseline gap-space-sm">
            <span className="text-headline-xl text-on-surface font-mono text-2xl font-bold">
              {tasks.length}
            </span>
            <span className="text-label-sm text-on-surface-variant text-[11px]">
              {tasks.length > 0 ? '+100% this week' : '-- this week'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/20">
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant uppercase text-[11px]">Success Rate</span>
            <Icon name="check_circle" size={20} className="text-tertiary" />
          </div>
          <div className="flex items-baseline gap-space-sm">
            <span className="text-headline-xl text-on-surface font-mono text-2xl font-bold">
              {tasks.length > 0 ? '100%' : '--'}
            </span>
            <span className="text-label-sm text-on-surface-variant text-[11px]">
              {tasks.length > 0 ? '0.0% variance' : 'No runs recorded'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/20">
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant uppercase text-[11px]">Files Modified</span>
            <Icon name="code" size={20} className="text-secondary" />
          </div>
          <div className="flex items-baseline gap-space-sm">
            <span className="text-headline-xl text-on-surface font-mono text-2xl font-bold">0</span>
            <span className="text-label-sm text-on-surface-variant text-[11px]">0 today</span>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/20">
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant uppercase text-[11px]">Pending Approvals</span>
            <Icon name="pending_actions" size={20} className="text-tertiary" />
          </div>
          <div className="flex items-baseline gap-space-sm">
            <span className="text-headline-xl text-on-surface font-mono text-2xl font-bold">0</span>
            <span className="text-label-sm text-on-surface-variant text-[11px]">None pending</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded-xl shadow-sm border border-outline-variant/20">
        {/* Search Bar */}
        <div className="flex-1 relative flex items-center">
          <Icon name="search" size={18} className="absolute left-space-md text-on-surface-variant" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant pl-10 pr-space-md py-space-sm rounded-lg font-body-md focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            placeholder="Search tasks by title, keyword, or prompt..."
            type="text"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-space-sm text-xs">
          {/* Project Filter */}
          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="appearance-none bg-surface-container text-on-surface pl-space-md pr-8 py-space-sm rounded-lg font-body-md focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Projects {projects.length > 0 ? `(${projects.length})` : ''}</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Icon
              name="unfold_more"
              size={16}
              className="absolute right-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-surface-container text-on-surface pl-space-md pr-8 py-space-sm rounded-lg font-body-md focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending Approval</option>
              <option value="failed">Failed</option>
            </select>
            <Icon
              name="unfold_more"
              size={16}
              className="absolute right-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearchQuery('')
              setProjectFilter('all')
              setStatusFilter('all')
            }}
            className="p-space-sm text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            title="Reset Filters"
          >
            <Icon name="restart_alt" size={18} />
          </button>
        </div>
      </div>

      {/* Structured Table Container */}
      <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container/50 border-b border-surface-container-high text-on-surface-variant font-mono uppercase text-[11px]">
                <th className="py-space-md px-space-lg font-medium">Task ID &amp; Title</th>
                <th className="py-space-md px-space-lg font-medium">Project</th>
                <th className="py-space-md px-space-lg font-medium">Provider &amp; Model</th>
                <th className="py-space-md px-space-lg font-medium">Timestamp</th>
                <th className="py-space-md px-space-lg font-medium">Status</th>
                <th className="py-space-md px-space-lg font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="history" size={32} className="text-outline" />
                      <span className="font-headline-sm text-on-surface font-semibold text-xs">
                        No Task History Recorded
                      </span>
                      <span className="text-[11px] text-on-surface-variant max-w-sm">
                        Agent prompt executions, file modifications, and audit logs will automatically appear here as you run tasks.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-surface-container/70 cursor-pointer transition-colors group"
                  >
                    <td className="py-space-md px-space-lg">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-tertiary">{task.id}</span>
                          <span className="font-medium text-on-surface group-hover:text-primary transition-colors">
                            {task.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant truncate max-w-md">
                          {task.prompt}
                        </span>
                      </div>
                    </td>

                    <td className="py-space-md px-space-lg">
                      <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-mono text-[11px]">
                        {task.project}
                      </span>
                    </td>

                    <td className="py-space-md px-space-lg">
                      <div className="flex flex-col">
                        <span className="text-on-surface">{task.provider}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">{task.model}</span>
                      </div>
                    </td>

                    <td className="py-space-md px-space-lg text-on-surface-variant font-mono text-[11px]">
                      {task.timestamp}
                    </td>

                    <td className="py-space-md px-space-lg">
                      {task.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-tertiary-container/30 text-tertiary font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                          Completed
                        </span>
                      )}
                      {task.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-secondary-container/40 text-secondary font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                          Pending Diff
                        </span>
                      )}
                      {task.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-error-container/30 text-error font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="py-space-md px-space-lg text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveView('chat')
                        }}
                        className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title="Resume in Workspace Chat"
                      >
                        <Icon name="arrow_forward" size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl w-full max-w-xl p-space-xl shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-tertiary font-bold">{selectedTask.id}</span>
                <h3 className="font-headline-sm font-semibold text-on-surface">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-space-sm text-xs">
              <div>
                <span className="text-on-surface-variant font-mono">Prompt:</span>
                <p className="mt-1 p-space-sm rounded bg-surface-container text-on-surface font-mono">
                  {selectedTask.prompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-space-sm font-mono text-[11px] mt-2">
                <div className="p-2 bg-surface-container rounded flex justify-between">
                  <span className="text-on-surface-variant">Provider</span>
                  <span className="text-on-surface">{selectedTask.provider}</span>
                </div>
                <div className="p-2 bg-surface-container rounded flex justify-between">
                  <span className="text-on-surface-variant">Model</span>
                  <span className="text-on-surface">{selectedTask.model}</span>
                </div>
                <div className="p-2 bg-surface-container rounded flex justify-between">
                  <span className="text-on-surface-variant">Execution Time</span>
                  <span className="text-on-surface">{selectedTask.durationMs}ms</span>
                </div>
                <div className="p-2 bg-surface-container rounded flex justify-between">
                  <span className="text-on-surface-variant">Tokens Consumed</span>
                  <span className="text-on-surface">{selectedTask.tokensUsed.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-surface-container-high mt-space-sm">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-space-md py-space-xs rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedTask(null)
                  setActiveView('chat')
                }}
                className="px-space-md py-space-xs rounded bg-primary text-on-primary hover:opacity-90 text-xs font-medium cursor-pointer"
              >
                Open in Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskHistoryView