import React from 'react'
import { useUiStore } from '../../app/useUiStore'
import Icon from '../../components/common/Icon'
import vLogo from '../../assets/glowing-gradient-v-logo.png'

export interface WelcomeHeroProps {
  onStartPrompt?: (prompt: string) => void
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ onStartPrompt }) => {
  const { selectWorkspaceFolder, setActiveView, recentWorkspaces, openWorkspacePath, workspace } = useUiStore()

  const quickStarters = [
    {
      icon: 'architecture',
      title: 'Analyze Architecture',
      description: 'Explain the structure of this project and key module boundaries.',
      prompt: 'Explain the architecture and high-level structure of this codebase.'
    },
    {
      icon: 'bug_report',
      title: 'Find Bugs & Code Smells',
      description: 'Audit code for potential bugs, security issues, or anti-patterns.',
      prompt: 'Review this project for potential bugs, security vulnerabilities, or anti-patterns.'
    },
    {
      icon: 'playlist_add_check',
      title: 'Run Tests & Fixes',
      description: 'Execute the project test suite and propose automated fixes.',
      prompt: 'Check the test suite of this project, verify all tests pass, and report status.'
    }
  ]

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-space-md py-space-lg gap-space-xl select-none">
      {/* Welcome Center Hero Section */}
      <div className="flex flex-col items-center text-center pt-space-lg pb-space-sm relative">
        {/* Ambient background glow */}
        <div className="absolute w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none -top-6" />

        {/* Logo Mark */}
        <div className="w-20 h-20 rounded-2xl bg-surface-container-high/80 flex items-center justify-center mb-space-md shadow-2xl relative border border-outline-variant p-2 group hover:scale-105 transition-transform">
          <img
            src={vLogo}
            alt="VersaRail AI"
            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          />
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-surface shadow-sm"
            title="Gateway Ready"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-headline-xl text-on-surface tracking-tight mb-space-xs text-xl md:text-2xl font-bold">
          VersaRail AI Agent Workstation
        </h1>

        {/* Subtitle */}
        <p className="font-body-md text-on-surface-variant max-w-md text-xs mb-space-lg">
          Local, privacy-first AI development harness. Connect BYOK models, run commands safely, and review diffs before disk mutation.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-space-sm mb-space-md">
          {!workspace.path ? (
            <button
              onClick={selectWorkspaceFolder}
              className="flex items-center gap-space-xs px-space-lg py-2 rounded-xl bg-primary text-on-primary text-xs font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              <Icon name="folder_open" size={16} />
              <span>Open Project Folder</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface font-mono">
              <Icon name="folder" size={15} className="text-primary" />
              <span className="font-semibold">{workspace.name}</span>
              <span className="text-emerald-500 text-[10px] ml-1">● Active</span>
            </div>
          )}

          <button
            onClick={() => setActiveView('ai-providers')}
            className="flex items-center gap-space-xs px-space-lg py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors border border-outline-variant cursor-pointer"
          >
            <Icon name="smart_toy" size={16} className="text-primary" />
            <span>Manage AI Providers</span>
          </button>
        </div>

        {/* Recent Projects Pills (Only show when no workspace is active) */}
        {!workspace.path && recentWorkspaces.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg mb-space-sm">
            <span className="text-[11px] text-on-surface-variant font-mono mr-1">Recent:</span>
            {recentWorkspaces.slice(0, 4).map((p) => {
              const isCurrent = p.path === workspace.path
              return (
                <button
                  key={p.path}
                  onClick={() => p.path && openWorkspacePath(p.path)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant'
                  }`}
                  title={p.path || p.name || ''}
                >
                  <Icon name="folder" size={12} className={isCurrent ? 'text-primary' : 'text-on-surface-variant'} />
                  <span className="truncate max-w-[120px]">{p.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Starter Action Tiles */}
      <div className="flex flex-col gap-2 max-w-2xl mx-auto w-full">
        <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider text-center">
          Suggested Prompts
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
          {quickStarters.map((starter) => (
            <button
              key={starter.title}
              onClick={() => onStartPrompt?.(starter.prompt)}
              className="flex flex-col items-start p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-all border border-outline-variant hover:border-primary/50 group text-left cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon name={starter.icon} size={15} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-on-surface">{starter.title}</span>
              </div>
              <span className="text-[11px] text-on-surface-variant leading-relaxed">
                {starter.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Highlights Bento Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-xs">
        {/* Card 1 */}
        <div className="flex flex-col bg-surface-container/60 p-space-md rounded-xl gap-1 border border-outline-variant">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="vpn_key" size={16} className="text-primary" />
            <span className="text-xs font-semibold text-on-surface">BYOK Direct Key</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Hardware-encrypted credentials. Your API keys are kept safe on local OS keychain.
          </p>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col bg-surface-container/60 p-space-md rounded-xl gap-1 border border-outline-variant">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="swap_horiz" size={16} className="text-tertiary" />
            <span className="text-xs font-semibold text-on-surface">Auto-Failover</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Automatic dead-turn failover between Gemini, Groq, Cerebras, and local OmniRoute.
          </p>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col bg-surface-container/60 p-space-md rounded-xl gap-1 border border-outline-variant">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="shield_lock" size={16} className="text-secondary" />
            <span className="text-xs font-semibold text-on-surface">Diff-First Safety</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Interactive unified diff viewer with tamper-proof payload hashes before applying changes.
          </p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeHero
