import React, { useState, useRef, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { useUiStore } from '../../app/useUiStore'

export interface PromptComposerProps {
  onSend?: (prompt: string) => void
  disabled?: boolean
}

export const PromptComposer: React.FC<PromptComposerProps> = ({ onSend, disabled = false }) => {
  const [prompt, setPrompt] = useState('')
  const { connectedModel, workspace, selectWorkspaceFolder, setActiveView } = useUiStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [prompt])

  const handleSend = () => {
    if (!prompt.trim() || disabled) return
    onSend?.(prompt.trim())
    setPrompt('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-space-xl bg-surface-dim border-t border-surface-container-high/60 shrink-0">
      <div className="max-w-4xl mx-auto flex flex-col gap-space-md bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 shadow-lg">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant/70 resize-none focus:outline-none text-body-lg min-h-[44px]"
          placeholder={`Ask ${connectedModel.name} to modify code, run tests, or explain changes... (Enter to send)`}
          rows={2}
        />

        <div className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/40">
          <div className="flex items-center gap-space-sm flex-wrap">
            {/* Attachment Button */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Attach Files"
              type="button"
            >
              <Icon name="attach_file" size={18} />
            </button>

            {/* Code Snippet Button */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Insert Code Snippet"
              type="button"
            >
              <Icon name="code" size={18} />
            </button>

            {/* Model Selector Dropdown Chip */}
            <div
              onClick={() => setActiveView('ai-providers')}
              className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container text-on-surface text-label-md cursor-pointer hover:bg-surface-container-high transition-colors border border-outline-variant/20"
              title="Click to change model or provider"
            >
              <Icon name="smart_toy" size={14} className="text-tertiary" />
              <span className="font-mono">{connectedModel.name}</span>
              <Icon name="arrow_drop_down" size={14} className="text-on-surface-variant" />
            </div>

            {/* Project Selector Dropdown Chip */}
            <div
              onClick={selectWorkspaceFolder}
              className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container text-on-surface text-label-md cursor-pointer hover:bg-surface-container-high transition-colors border border-outline-variant/20"
              title="Click to switch workspace folder"
            >
              <Icon name="folder" size={14} className="text-primary" />
              <span className="font-mono max-w-[120px] truncate">
                {workspace.name || 'Select Project'}
              </span>
              <Icon name="arrow_drop_down" size={14} className="text-on-surface-variant" />
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || disabled}
            className="flex items-center gap-space-sm px-space-lg py-space-sm rounded bg-primary text-on-primary text-label-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <span>Send</span>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PromptComposer

