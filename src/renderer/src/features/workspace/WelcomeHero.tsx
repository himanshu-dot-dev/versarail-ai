import React, { useState } from 'react'
import { useUiStore } from '../../app/useUiStore'
import Icon from '../../components/common/Icon'

export interface WelcomeHeroProps {
  onStartPrompt?: (prompt: string) => void
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ onStartPrompt }) => {
  const { selectWorkspaceFolder, setActiveView, recentWorkspaces, openWorkspacePath } = useUiStore()
  const [promptInput, setPromptInput] = useState('')

  const examplePrompts = [
    'Explain the structure of this project.',
    'Create a REST API with authentication.',
    'Review and improve the README.'
  ]

  const handleStartPrompt = (prompt: string) => {
    if (onStartPrompt) {
      onStartPrompt(prompt)
    } else {
      setPromptInput(prompt)
    }
  }

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-space-xl py-space-xl gap-space-xl select-none">
      {/* Welcome Center Hero Section */}
      <div className="flex flex-col items-center text-center pt-space-xl pb-space-lg relative">
        {/* Ambient background glow */}
        <div className="absolute w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -top-10" />

        {/* Logo Mark */}
        <div className="w-16 h-16 rounded-xl bg-surface-container-high flex items-center justify-center mb-space-lg shadow-xl relative border border-outline-variant">
          <Icon name="hub" size={32} className="text-primary" filled />
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-tertiary flex items-center justify-center border-2 border-surface"
            title="Connected Gateway"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-headline-xl text-on-surface tracking-tight mb-space-sm max-w-xl">
          Your AI. Your keys. Your workspace.
        </h1>

        {/* Subtitle */}
        <p className="font-body-lg text-on-surface-variant max-w-lg mb-space-xl">
          Connect your preferred AI providers, maintain absolute control over local project files, and build with native desktop speed.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-space-md mb-space-xl">
          <button
            onClick={selectWorkspaceFolder}
            className="flex items-center gap-space-sm px-space-lg py-space-md rounded-xl bg-primary text-on-primary font-headline-sm hover:opacity-90 transition-all shadow-md font-medium"
          >
            <Icon name="folder_open" size={18} className="text-on-primary" />
            <span>Open a Folder</span>
          </button>

          <button
            onClick={() => setActiveView('ai-providers')}
            className="flex items-center gap-space-sm px-space-lg py-space-md rounded-xl bg-surface-container-high text-on-surface font-headline-sm hover:bg-surface-container-highest transition-all border border-outline-variant font-medium"
          >
            <Icon name="smart_toy" size={18} className="text-primary" />
            <span>Connect an AI Provider</span>
          </button>
        </div>

        {recentWorkspaces.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-space-lg max-w-xl">
            <span className="text-[11px] text-on-surface-variant font-mono">Recent:</span>
            {recentWorkspaces.slice(0, 4).map((p) => (
              <button
                key={p.path}
                onClick={() => p.path && openWorkspacePath(p.path)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono border border-outline-variant transition-colors cursor-pointer"
                title={p.path || p.name || ''}
              >
                <Icon name="folder" size={13} className="text-primary" />
                <span className="truncate max-w-[130px]">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Input & Example Prompts Container */}
      <div className="flex flex-col w-full max-w-2xl mx-auto bg-surface-container rounded-xl p-space-lg shadow-xl gap-space-md border border-outline-variant">
        <div className="flex items-center gap-space-md">
          <Icon name="terminal" size={20} className="text-primary" />
          <input
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && promptInput.trim()) {
                handleStartPrompt(promptInput)
              }
            }}
            className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant/60 font-body-lg focus:outline-none"
            placeholder="What would you like to build or change?"
            type="text"
          />
          <button
            onClick={() => {
              if (promptInput.trim()) {
                handleStartPrompt(promptInput)
              }
            }}
            className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-primary-container hover:text-on-primary-container transition-all shrink-0"
            title="Start"
          >
            <Icon name="arrow_upward" size={16} />
          </button>
        </div>

        {/* Example Prompt Pills */}
        <div className="flex flex-wrap items-center gap-space-xs pt-space-xs">
          <span className="text-label-sm text-on-surface-variant mr-space-xs font-mono">Try asking:</span>
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleStartPrompt(prompt)}
              className="px-space-md py-space-xs rounded-full bg-surface-container-low text-on-surface-variant text-label-sm hover:bg-surface-container-high hover:text-on-surface transition-all border border-outline-variant"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Three Compact Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg mt-space-lg pb-space-xl">
        {/* Card 1 */}
        <div className="flex flex-col bg-surface-container p-space-lg rounded-xl gap-space-sm hover:bg-surface-container-high transition-all group border border-outline-variant shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-space-xs group-hover:scale-105 transition-transform">
            <Icon name="vpn_key" size={20} className="text-primary" />
          </div>
          <h3 className="font-headline-sm text-on-surface">Bring Your Own Key</h3>
          <p className="font-body-md text-on-surface-variant">
            Use your Google Gemini, Groq, Cerebras, or OpenRouter credentials directly with hardware-backed encryption.
          </p>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col bg-surface-container p-space-lg rounded-xl gap-space-sm hover:bg-surface-container-high transition-all group border border-outline-variant shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary mb-space-xs group-hover:scale-105 transition-transform">
            <Icon name="swap_horiz" size={20} className="text-tertiary" />
          </div>
          <h3 className="font-headline-sm text-on-surface">Automatic Provider Fallback</h3>
          <p className="font-body-md text-on-surface-variant">
            Never lose conversation context. Automatically route requests to backup endpoints when rate limits or quotas occur.
          </p>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col bg-surface-container p-space-lg rounded-xl gap-space-sm hover:bg-surface-container-high transition-all group border border-outline-variant shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary mb-space-xs group-hover:scale-105 transition-transform">
            <Icon name="shield_lock" size={20} className="text-secondary" />
          </div>
          <h3 className="font-headline-sm text-on-surface">Diff-First & Local Safety</h3>
          <p className="font-body-md text-on-surface-variant">
            Review unified diffs before any change touches disk. Strict permission broker defends against prompt injection.
          </p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeHero

