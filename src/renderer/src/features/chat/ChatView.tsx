import React, { useState } from 'react'
import { useUiStore } from '../../app/useUiStore'
import WelcomeHero from '../workspace/WelcomeHero'
import ExecutionTimeline from './ExecutionTimeline'
import ToolActivityStream from './ToolActivityStream'
import FileChangeBanner from './FileChangeBanner'
import PromptComposer from './PromptComposer'
import Icon from '../../components/common/Icon'

export const ChatView: React.FC = () => {
  const { hasActiveRun, setHasActiveRun, connectedModel, workspace } = useUiStore()
  const [messages, setMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; text: string; time: string }>
  >([
    {
      id: 'msg-1',
      role: 'user',
      text: 'Analyze this project, identify the main issues, and refactor the authentication module without changing the public API.',
      time: '10:42 AM'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      text: "I'll inspect the project structure, review the authentication module, and propose the required changes before applying them.",
      time: '10:42 AM'
    }
  ])

  const handleSendPrompt = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'user',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])
    setHasActiveRun(true)
  }

  // If user hasn't started any run and no project is open, show WelcomeHero
  if (!hasActiveRun && !workspace.path) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <WelcomeHero />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface relative min-w-0 overflow-hidden">
      {/* Top Context Bar / Banner */}
      <div className="h-12 bg-surface-container-lowest flex items-center justify-between px-space-xl z-10 border-b border-surface-container-high/60 shrink-0">
        <div className="flex items-center gap-space-md min-w-0">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shrink-0" />
          <span className="text-headline-sm text-on-surface truncate font-medium">
            Agent Execution: Auth Module Refactoring
          </span>
          <span className="text-label-sm px-space-sm py-space-xs rounded bg-surface-container text-on-surface-variant font-mono shrink-0 border border-outline-variant/20">
            Active Run #842
          </span>
        </div>

        <div className="flex items-center gap-space-sm shrink-0">
          <button
            className="flex items-center gap-space-xs px-space-md py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md font-mono transition-colors border border-outline-variant/20"
            title="Inspect Execution Logs"
          >
            <Icon name="terminal" size={16} />
            <span>Logs</span>
          </button>
          <button
            className="flex items-center gap-space-xs px-space-md py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md font-mono transition-colors border border-outline-variant/20"
            title="Agent Run Parameters"
          >
            <Icon name="tune" size={16} />
            <span>Parameters</span>
          </button>
        </div>
      </div>

      {/* Scrollable Conversation & Timeline Area */}
      <div className="flex-1 overflow-y-auto px-space-xl py-space-xl flex flex-col gap-space-xl">
        {/* User Message */}
        <div className="flex gap-space-lg max-w-3xl">
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30">
            <Icon name="person" size={18} className="text-on-surface" />
          </div>
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm">
              <span className="text-headline-sm text-on-surface font-semibold">You</span>
              <span className="text-label-sm text-on-surface-variant font-mono">10:42 AM</span>
            </div>
            <div className="text-body-lg text-on-surface bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/20 shadow-sm leading-relaxed">
              Analyze this project, identify the main issues, and refactor the authentication module without changing the public API.
            </div>
          </div>
        </div>

        {/* Assistant Message with Timeline & Tool Activity */}
        <div className="flex gap-space-lg max-w-4xl">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0 shadow-sm">
            <Icon name="smart_toy" size={18} className="text-on-primary-container" />
          </div>

          <div className="flex flex-col gap-space-md flex-1 min-w-0">
            <div className="flex items-center gap-space-sm">
              <span className="text-headline-sm text-on-surface font-semibold">{connectedModel.name}</span>
              <span className="text-label-sm text-tertiary font-mono">Executing Agent Workflow</span>
            </div>

            <div className="text-body-lg text-on-surface bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/20 shadow-sm leading-relaxed">
              I'll inspect the project structure, review the authentication module, and propose the required changes before applying them.
            </div>

            {/* Expandable Task Execution Timeline */}
            <ExecutionTimeline />

            {/* Realistic Tool Activity Events */}
            <ToolActivityStream />

            {/* File Change Summary Banner & Actions */}
            <FileChangeBanner />
          </div>
        </div>
      </div>

      {/* Chat Composer Anchored at Bottom */}
      <PromptComposer onSend={handleSendPrompt} />
    </div>
  )
}

export default ChatView

