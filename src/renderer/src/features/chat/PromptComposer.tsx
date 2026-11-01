import React, { useState, useRef, useEffect, useMemo } from 'react'
import Icon from '../../components/common/Icon'
import { useUiStore } from '../../app/useUiStore'

export interface PromptComposerProps {
  onSend?: (prompt: string) => void
  disabled?: boolean
}

interface ModelItem {
  id: string
  name: string
  providerId: string
}

export const PromptComposer: React.FC<PromptComposerProps> = ({ onSend, disabled = false }) => {
  const [prompt, setPrompt] = useState('')
  const { connectedModel, setConnectedModel, workspace, selectWorkspaceFolder, setActiveView } = useUiStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Model Picker State
  const [isModelOpen, setIsModelOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [models, setModels] = useState<ModelItem[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const modelPickerRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [prompt])

  // Fetch available models when dropdown opens
  useEffect(() => {
    if (isModelOpen && models.length === 0 && window.electronApi?.listModels) {
      setIsLoadingModels(true)
      window.electronApi
        .listModels()
        .then((res) => {
          if (Array.isArray(res)) {
            setModels(res.map((m) => ({ id: m.id, name: m.name || m.id, providerId: m.providerId })))
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingModels(false))
    }
  }, [isModelOpen, models.length])

  // Click outside to close model dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setIsModelOpen(false)
      }
    }
    if (isModelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isModelOpen])

  // Filtered models
  const { autoModels, otherModels } = useMemo(() => {
    const query = modelSearch.toLowerCase().trim()
    const matches = query
      ? models.filter((m) => m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query))
      : models

    const auto = matches.filter((m) => m.id.startsWith('auto/') || m.name.includes('(Auto'))
    const regular = matches.filter((m) => !m.id.startsWith('auto/') && !m.name.includes('(Auto'))

    return { autoModels: auto, otherModels: regular.slice(0, 80) }
  }, [models, modelSearch])

  const handleSelectModel = (model: ModelItem) => {
    const providerLabel =
      model.providerId === 'custom'
        ? 'OmniRoute Local'
        : model.providerId === 'gemini'
        ? 'Google AI Studio'
        : model.providerId === 'groq'
        ? 'GroqCloud'
        : model.providerId === 'cerebras'
        ? 'Cerebras'
        : 'OpenRouter'

    setConnectedModel({
      name: model.id,
      provider: providerLabel,
      providerId: model.providerId,
      isConnected: true
    })
    setIsModelOpen(false)
    setModelSearch('')
  }

  const handleSelectAutoMode = () => {
    handleSelectModel({
      id: 'auto/gpt',
      name: 'auto/gpt',
      providerId: 'custom'
    })
  }

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

  const isAutoModeActive = connectedModel.name.startsWith('auto/')

  return (
    <div className="p-space-xl bg-surface-dim border-t border-border-subtle shrink-0 relative">
      <div className="max-w-4xl mx-auto flex flex-col gap-space-md bg-surface-container p-space-md rounded-xl border border-outline-variant shadow-lg relative">
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

        <div className="flex items-center justify-between pt-space-xs border-t border-border-subtle">
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

            {/* Interactive Model Selector Dropdown */}
            <div className="relative" ref={modelPickerRef}>
              <button
                type="button"
                onClick={() => setIsModelOpen((prev) => !prev)}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors border cursor-pointer ${
                  isAutoModeActive
                    ? 'bg-primary-container/30 border-primary/40 text-primary hover:bg-primary-container/50'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant'
                }`}
                title="Click to switch model or enable OmniRoute Auto-Switch"
              >
                <Icon
                  name={isAutoModeActive ? 'bolt' : 'smart_toy'}
                  size={14}
                  className={isAutoModeActive ? 'text-primary' : 'text-tertiary'}
                />
                <span className="font-mono text-xs max-w-[160px] truncate">
                  {isAutoModeActive ? `Auto: ${connectedModel.name}` : connectedModel.name}
                </span>
                <Icon name="arrow_drop_down" size={14} className="text-on-surface-variant" />
              </button>

              {/* Floating Model Selection Popover */}
              {isModelOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-80 md:w-96 max-h-[460px] bg-surface-container border border-outline-variant rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in font-sans">
                  {/* Popover Header & Search */}
                  <div className="p-space-md border-b border-border-subtle bg-surface-container-lowest/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                        <Icon name="hub" size={14} className="text-primary" />
                        <span>Select Model & Auto-Switch</span>
                      </div>
                      <button
                        onClick={() => {
                          setIsModelOpen(false)
                          setActiveView('ai-providers')
                        }}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Manage Keys</span>
                        <Icon name="chevron_right" size={12} />
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <Icon name="search" size={14} className="absolute left-2.5 text-on-surface-variant" />
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Filter models (e.g. auto, claude, gpt, llama)..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50 font-mono"
                        autoFocus
                      />
                      {modelSearch && (
                        <button
                          onClick={() => setModelSearch('')}
                          className="absolute right-2 text-on-surface-variant hover:text-on-surface"
                        >
                          <Icon name="close" size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Auto Switch Feature Banner */}
                  <div className="p-space-sm bg-primary/10 border-b border-primary/20">
                    <button
                      type="button"
                      onClick={handleSelectAutoMode}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        connectedModel.name === 'auto/gpt' || connectedModel.name === 'auto/best-coding'
                          ? 'bg-primary text-on-primary font-medium shadow-sm'
                          : 'hover:bg-primary/15 text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name="bolt" size={16} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate">Auto-Switch (Gateway Auto Route)</span>
                          <span className="text-[10px] opacity-80 truncate">
                            Automatic gateway fallback across all providers
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border border-current shrink-0">
                        Auto Active
                      </span>
                    </button>
                  </div>

                  {/* Scrollable Model Lists */}
                  <div className="flex-1 overflow-y-auto p-space-xs flex flex-col gap-1 max-h-[300px]">
                    {isLoadingModels ? (
                      <div className="p-6 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
                        <Icon name="sync" size={18} className="animate-spin text-primary" />
                        <span>Loading models from gateway...</span>
                      </div>
                    ) : (
                      <>
                        {/* Auto-Switch Group */}
                        {autoModels.length > 0 && (
                          <div className="mb-2">
                            <div className="px-2 py-1 text-[10px] uppercase font-mono font-semibold text-primary/80 tracking-wider">
                              ⚡ OmniRoute Auto Combos ({autoModels.length})
                            </div>
                            {autoModels.map((m) => {
                              const isSelected = connectedModel.name === m.id
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => handleSelectModel(m)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-primary-container text-on-primary-container font-medium'
                                      : 'hover:bg-surface-container text-on-surface'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Icon name="bolt" size={14} className="text-primary shrink-0" />
                                    <span className="font-mono truncate">{m.id}</span>
                                  </div>
                                  {isSelected && <Icon name="check" size={14} className="text-primary shrink-0" />}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Individual Models Group */}
                        <div>
                          <div className="px-2 py-1 text-[10px] uppercase font-mono font-semibold text-on-surface-variant tracking-wider">
                            Individual Models ({otherModels.length}
                            {models.length > otherModels.length ? ` of ${models.length}` : ''})
                          </div>
                          {otherModels.length === 0 ? (
                            <div className="p-4 text-center text-xs text-on-surface-variant">
                              No models matching "{modelSearch}"
                            </div>
                          ) : (
                            otherModels.map((m) => {
                              const isSelected = connectedModel.name === m.id
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => handleSelectModel(m)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-primary-container text-on-primary-container font-medium'
                                      : 'hover:bg-surface-container text-on-surface'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono truncate">{m.id}</span>
                                  </div>
                                  <span className="text-[10px] text-on-surface-variant font-mono uppercase shrink-0 ml-2">
                                    {m.providerId}
                                  </span>
                                </button>
                              )
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Project Selector Dropdown Chip */}
            <div
              onClick={selectWorkspaceFolder}
              className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container text-on-surface text-label-md cursor-pointer hover:bg-surface-container-high transition-colors border border-outline-variant"
              title="Click to switch workspace folder"
            >
              <Icon name="folder" size={14} className="text-primary" />
              <span className="font-mono max-w-[120px] truncate">{workspace.name || 'Select Project'}</span>
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
