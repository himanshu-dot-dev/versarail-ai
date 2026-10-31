import React, { useState, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { useUiStore, ThemeMode } from '../../app/useUiStore'

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useUiStore()

  const [activeCategory, setActiveCategory] = useState<
    'general' | 'ai-defaults' | 'agent-permissions' | 'appearance' | 'privacy'
  >('general')

  // General settings state
  const [launchAtStartup, setLaunchAtStartup] = useState(false)
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true)
  const [telemetry, setTelemetry] = useState(false)

  // AI Defaults state
  const [defaultModel, setDefaultModel] = useState('gemini-2.5-flash')
  const [codeEngine, setCodeEngine] = useState('groq-llama-3.3-70b')
  const [temperature, setTemperature] = useState(0.7)

  // Permissions state
  const [autoFileMod, setAutoFileMod] = useState(false)
  const [terminalExecution, setTerminalExecution] = useState(false)
  const [networkRequests, setNetworkRequests] = useState(true)

  // Privacy & Context Management state
  const [allowedProviders, setAllowedProviders] = useState<string[]>([
    'gemini',
    'groq',
    'cerebras',
    'openrouter'
  ])
  const [auditRetentionDays, setAuditRetentionDays] = useState(30)
  const [contextBudgetTokens, setContextBudgetTokens] = useState(32_000)
  const [autoSummarize, setAutoSummarize] = useState(true)

  // Save feedback state
  const [savedToast, setSavedToast] = useState(false)

  // Load persisted privacy & settings on mount
  useEffect(() => {
    if (window.electronApi?.getSettings) {
      window.electronApi.getSettings().then((res) => {
        if (res?.privacy) {
          setAllowedProviders(res.privacy.allowedProviders || ['gemini', 'groq', 'cerebras', 'openrouter'])
          setAuditRetentionDays(res.privacy.auditRetentionDays ?? 30)
          setContextBudgetTokens(res.privacy.contextWindowBudgetTokens ?? 32_000)
          setAutoSummarize(res.privacy.autoSummarizeContext ?? true)
        }
      }).catch(console.error)
    }
  }, [])

  const handleSave = async () => {
    if (window.electronApi?.saveSettings) {
      await window.electronApi.saveSettings({
        allowedProviders,
        auditRetentionDays,
        contextWindowBudgetTokens: contextBudgetTokens,
        autoSummarizeContext: autoSummarize,
        allowPublicCloud: true,
        autoRedactSecrets: true
      })
    }
    setSavedToast(true)
    setTimeout(() => {
      setSavedToast(false)
    }, 2000)
  }

  const handlePurgeDb = async () => {
    if (confirm('Permanently purge local SQLite conversation history? Credentials remain safe.')) {
      if (window.electronApi?.purgeData) {
        const res = await window.electronApi.purgeData(0)
        alert(`Purge complete. Cleaned ${res.purgedConversations} conversations.`)
      }
    }
  }

  const toggleProvider = (providerId: string) => {
    setAllowedProviders((prev) =>
      prev.includes(providerId) ? prev.filter((p) => p !== providerId) : [...prev, providerId]
    )
  }

  const handleReset = () => {
    setLaunchAtStartup(false)
    setHardwareAcceleration(true)
    setTelemetry(false)
    setDefaultModel('gemini-2.5-flash')
    setCodeEngine('groq-llama-3.3-70b')
    setTemperature(0.7)
    setAutoFileMod(false)
    setTerminalExecution(false)
    setNetworkRequests(true)
    setTheme('versarail-dark')
    handleSave()
  }

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-2.5rem)] bg-surface text-on-surface select-none font-sans">
      {/* Top Header Bar for Settings Context */}
      <div className="px-space-xl py-space-lg flex items-center justify-between bg-surface-container-lowest border-b border-surface-container-high/60">
        <div>
          <div className="flex items-center gap-space-sm mb-1">
            <span className="text-label-sm text-primary uppercase tracking-wider text-[11px] font-mono">
              Preferences &amp; Configuration
            </span>
            <span className="text-on-surface-variant/40">/</span>
            <span className="text-label-sm text-on-surface-variant font-mono text-[11px]">
              Global System
            </span>
          </div>
          <h1 className="font-headline-xl text-on-surface text-2xl font-bold tracking-tight">Settings</h1>
          <p className="font-body-md text-on-surface-variant text-xs mt-0.5">
            Configure global desktop preferences, AI model routing defaults, and execution permissions.
          </p>
        </div>

        <div className="flex items-center gap-space-md">
          <button
            onClick={handleReset}
            className="px-space-lg py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-space-lg py-space-sm rounded-lg bg-primary text-on-primary text-xs font-medium hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5"
          >
            {savedToast ? (
              <>
                <Icon name="check" size={16} />
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Main Settings Workspace Layout */}
      <div className="flex flex-1 w-full">
        {/* Secondary Vertical Navigation */}
        <aside className="w-64 bg-surface-container-low p-space-md flex flex-col gap-space-xs shrink-0 select-none border-r border-surface-container-high/40">
          <div className="text-label-sm text-on-surface-variant px-space-md py-space-sm uppercase tracking-wider text-[10px] font-mono">
            Categories
          </div>
          <nav className="flex flex-col gap-space-xs text-xs">
            {(
              [
                { id: 'general', label: 'General', icon: 'tune' },
                { id: 'ai-defaults', label: 'AI Defaults', icon: 'neurology' },
                { id: 'agent-permissions', label: 'Agent Permissions', icon: 'security' },
                { id: 'appearance', label: 'Appearance', icon: 'palette' },
                { id: 'privacy', label: 'Privacy & Security', icon: 'shield_lock' }
              ] as const
            ).map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-space-md px-space-md py-space-sm rounded-lg font-medium transition-all text-left ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <Icon
                    name={cat.icon}
                    size={18}
                    className={isActive ? 'text-on-primary-container' : 'text-on-surface-variant'}
                  />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto p-space-md rounded-lg bg-surface-container-lowest flex flex-col gap-space-xs border border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <Icon name="info" size={16} className="text-tertiary" />
              <span className="text-label-sm text-on-surface font-semibold text-xs">VersaRail Engine</span>
            </div>
            <p className="text-body-sm text-on-surface-variant text-[11px] font-mono">
              v0.1.0-alpha (Electron 45 / Node 24)
            </p>
          </div>
        </aside>

        {/* Form Content Area */}
        <div className="flex-1 p-space-xl overflow-y-auto max-w-4xl flex flex-col gap-space-xl">
          {/* General Section */}
          {activeCategory === 'general' && (
            <section className="flex flex-col gap-space-lg bg-surface-container-low p-space-xl rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container-high">
                <div>
                  <h2 className="font-headline-lg text-on-surface text-base font-semibold">
                    General Preferences
                  </h2>
                  <p className="font-body-md text-on-surface-variant text-xs">
                    Manage desktop behavior, startup actions, and telemetry options.
                  </p>
                </div>
                <Icon name="tune" size={24} className="text-primary" />
              </div>

              <div className="flex flex-col gap-space-lg text-xs">
                {/* Launch at startup */}
                <div className="flex items-center justify-between py-space-sm">
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-on-surface font-medium text-xs">
                      Launch at system startup
                    </span>
                    <span className="font-body-md text-on-surface-variant text-[11px]">
                      Start VersaRail AI automatically when your operating system boots up.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={launchAtStartup}
                      onChange={(e) => setLaunchAtStartup(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Hardware acceleration */}
                <div className="flex items-center justify-between py-space-sm border-t border-surface-container-high/60 pt-space-md">
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-on-surface font-medium text-xs">
                      Hardware Acceleration
                    </span>
                    <span className="font-body-md text-on-surface-variant text-[11px]">
                      Utilize GPU rendering for smoother UI transitions and diff viewer rendering.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hardwareAcceleration}
                      onChange={(e) => setHardwareAcceleration(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Telemetry */}
                <div className="flex items-center justify-between py-space-sm border-t border-surface-container-high/60 pt-space-md">
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-on-surface font-medium text-xs">
                      Anonymous Crash Diagnostics
                    </span>
                    <span className="font-body-md text-on-surface-variant text-[11px]">
                      Send sanitized local crash stack traces to help resolve unexpected desktop errors.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telemetry}
                      onChange={(e) => setTelemetry(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* AI Defaults Section */}
          {activeCategory === 'ai-defaults' && (
            <section className="flex flex-col gap-space-lg bg-surface-container-low p-space-xl rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container-high">
                <div>
                  <h2 className="font-headline-lg text-on-surface text-base font-semibold">
                    AI Model Defaults
                  </h2>
                  <p className="font-body-md text-on-surface-variant text-xs">
                    Select primary reasoning engines and context window parameters.
                  </p>
                </div>
                <Icon name="neurology" size={24} className="text-primary" />
              </div>

              <div className="grid grid-cols-2 gap-space-lg text-xs">
                {/* Primary Chat Model */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-headline-sm text-on-surface font-medium">Primary Chat Model</label>
                  <span className="font-body-sm text-on-surface-variant text-[11px]">
                    Default LLM for general prompts and agentic chat.
                  </span>
                  <div className="relative mt-1">
                    <select
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      className="w-full bg-surface-container-highest text-on-surface px-space-md py-space-sm rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Google AI Studio)</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Google AI Studio)</option>
                      <option value="llama-3.3-70b">Llama 3.3 70B (GroqCloud LPU)</option>
                      <option value="cerebras-llama">Llama 3.1 70B (Cerebras Cloud)</option>
                    </select>
                    <Icon
                      name="expand_more"
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                    />
                  </div>
                </div>

                {/* Code Autocomplete Engine */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-headline-sm text-on-surface font-medium">
                    Fast Tool &amp; Diff Engine
                  </label>
                  <span className="font-body-sm text-on-surface-variant text-[11px]">
                    Low-latency model for quick edits and diff generation.
                  </span>
                  <div className="relative mt-1">
                    <select
                      value={codeEngine}
                      onChange={(e) => setCodeEngine(e.target.value)}
                      className="w-full bg-surface-container-highest text-on-surface px-space-md py-space-sm rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    >
                      <option value="groq-llama-3.3-70b">Groq Llama 3.3 70B (~300 t/s)</option>
                      <option value="cerebras-llama">Cerebras Llama 3.1 70B (~1,800 t/s)</option>
                      <option value="gemini-flash">Gemini 2.5 Flash</option>
                    </select>
                    <Icon
                      name="expand_more"
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="flex flex-col gap-space-xs pt-space-md border-t border-surface-container-high/60 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-headline-sm text-on-surface font-medium">
                    Sampling Temperature ({temperature})
                  </label>
                  <span className="text-[11px] font-mono text-tertiary">
                    {temperature < 0.3 ? 'Deterministic / Precise' : temperature > 0.8 ? 'Creative' : 'Balanced'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer mt-1"
                />
              </div>
            </section>
          )}

          {/* Permissions Section */}
          {activeCategory === 'agent-permissions' && (
            <section className="flex flex-col gap-space-lg bg-surface-container-low p-space-xl rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container-high">
                <div>
                  <h2 className="font-headline-lg text-on-surface text-base font-semibold">
                    Agent Permissions &amp; Tool Safety
                  </h2>
                  <p className="font-body-md text-on-surface-variant text-xs">
                    Fine-tune the security boundaries and approval requirements for agent actions.
                  </p>
                </div>
                <Icon name="security" size={24} className="text-primary" />
              </div>

              <div className="flex flex-col gap-space-lg text-xs">
                {/* Automatic File Modification */}
                <div className="flex items-center justify-between py-space-sm">
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-on-surface font-medium text-xs">
                      Auto-Apply File Changes (No Review)
                    </span>
                    <span className="font-body-md text-on-surface-variant text-[11px]">
                      When disabled (recommended), the harness presents an interactive diff review before touching disk.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoFileMod}
                      onChange={(e) => setAutoFileMod(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Terminal Command Execution */}
                <div className="flex items-center justify-between py-space-sm border-t border-surface-container-high/60 pt-space-md">
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-on-surface font-medium text-xs">
                      Terminal Command Execution
                    </span>
                    <span className="font-body-md text-on-surface-variant text-[11px]">
                      Allow agents to run safe shell commands (npm test, git status) with interactive permission prompt.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={terminalExecution}
                      onChange={(e) => setTerminalExecution(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* External Network Requests */}
                <div className="flex items-center justify-between py-space-sm border-t border-surface-container-high/60 pt-space-md">
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-on-surface font-medium text-xs">
                      Direct Provider API Calls
                    </span>
                    <span className="font-body-md text-on-surface-variant text-[11px]">
                      Allow Electron main process to connect directly to configured AI provider endpoints.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={networkRequests}
                      onChange={(e) => setNetworkRequests(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* Appearance Section */}
          {activeCategory === 'appearance' && (
            <section className="flex flex-col gap-space-lg bg-surface-container-low p-space-xl rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container-high">
                <div>
                  <h2 className="font-headline-lg text-on-surface text-base font-semibold">
                    Appearance &amp; Theme
                  </h2>
                  <p className="font-body-md text-on-surface-variant text-xs">
                    Customize workspace color themes, typography, and contrast.
                  </p>
                </div>
                <Icon name="palette" size={24} className="text-primary" />
              </div>

              <div className="flex flex-col gap-space-md text-xs">
                <label className="font-headline-sm text-on-surface font-medium">Theme Mode</label>
                <div className="grid grid-cols-3 gap-space-md">
                  {/* VersaRail Dark */}
                  <div
                    onClick={() => setTheme('versarail-dark')}
                    className={`flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-container cursor-pointer transition-all border-2 ${
                      theme === 'versarail-dark'
                        ? 'border-primary ring-1 ring-primary/40'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-[#13131b] flex flex-col p-2 gap-1.5 border border-outline-variant/30">
                      <div className="w-1/2 h-2.5 bg-[#252530] rounded"></div>
                      <div className="w-3/4 h-2 bg-[#1b1b23] rounded"></div>
                      <div className="w-1/3 h-3 bg-[#c0c1ff] rounded mt-auto"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-headline-sm text-on-surface text-xs font-medium">
                        VersaRail Dark
                      </span>
                      {theme === 'versarail-dark' && (
                        <Icon name="check_circle" size={16} className="text-primary" />
                      )}
                    </div>
                  </div>

                  {/* Light Theme */}
                  <div
                    onClick={() => setTheme('light')}
                    className={`flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-container cursor-pointer transition-all border-2 ${
                      theme === 'light'
                        ? 'border-primary ring-1 ring-primary/40'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-[#faf8ff] flex flex-col p-2 gap-1.5 border border-slate-300">
                      <div className="w-1/2 h-2.5 bg-[#e4e1ed] rounded"></div>
                      <div className="w-3/4 h-2 bg-[#d2cfda] rounded"></div>
                      <div className="w-1/3 h-3 bg-[#494bd6] rounded mt-auto"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-headline-sm text-on-surface text-xs font-medium">
                        Light Mode
                      </span>
                      {theme === 'light' && (
                        <Icon name="check_circle" size={16} className="text-primary" />
                      )}
                    </div>
                  </div>

                  {/* System Sync */}
                  <div
                    onClick={() => setTheme('system')}
                    className={`flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-container cursor-pointer transition-all border-2 ${
                      theme === 'system'
                        ? 'border-primary ring-1 ring-primary/40'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-gradient-to-r from-[#13131b] to-[#faf8ff] flex flex-col p-2 gap-1.5 border border-outline-variant/30">
                      <div className="w-1/2 h-2.5 bg-white/40 rounded"></div>
                      <div className="w-3/4 h-2 bg-black/20 rounded"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-headline-sm text-on-surface text-xs font-medium">
                        System Sync
                      </span>
                      {theme === 'system' && (
                        <Icon name="check_circle" size={16} className="text-primary" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Privacy & Security Section */}
          {activeCategory === 'privacy' && (
            <section className="flex flex-col gap-space-lg bg-surface-container-low p-space-xl rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container-high">
                <div>
                  <h2 className="font-headline-lg text-on-surface text-base font-semibold">
                    Privacy, Routing &amp; Data Policies
                  </h2>
                  <p className="font-body-md text-on-surface-variant text-xs">
                    Workspace provider access gating, context window budgeting, and retention cleanup.
                  </p>
                </div>
                <Icon name="shield_lock" size={24} className="text-primary" />
              </div>

              <div className="flex flex-col gap-space-md text-xs">
                {/* 1. Allowed Providers Gating */}
                <div className="p-space-md rounded-lg bg-surface-container flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <Icon name="policy" size={18} className="text-primary" />
                      <span className="text-on-surface font-medium">Permitted Workspace AI Providers</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      Restricts data egress
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Failover and agent prompt dispatching will only communicate with checked providers:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { id: 'gemini', label: 'Google Gemini' },
                      { id: 'groq', label: 'Groq Cloud' },
                      { id: 'cerebras', label: 'Cerebras' },
                      { id: 'openrouter', label: 'OpenRouter' }
                    ].map((p) => {
                      const isAllowed = allowedProviders.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleProvider(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                            isAllowed
                              ? 'bg-primary-container text-on-primary-container border-primary/40 font-semibold shadow-xs'
                              : 'bg-surface-container-high text-on-surface-variant border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <Icon name={isAllowed ? 'check' : 'close'} size={14} />
                          <span>{p.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Context Window Budget & Auto-Summarization */}
                <div className="p-space-md rounded-lg bg-surface-container flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <Icon name="tune" size={18} className="text-tertiary" />
                      <span className="text-on-surface font-medium">Context Window Budget &amp; Summarization</span>
                    </div>
                    <span className="text-[10px] text-tertiary font-mono">
                      {contextBudgetTokens.toLocaleString()} tokens
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Sets max token ceiling for conversations before historical turns are compacted:
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {[8_000, 16_000, 32_000, 64_000, 128_000].map((b) => (
                      <button
                        key={b}
                        onClick={() => setContextBudgetTokens(b)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                          contextBudgetTokens === b
                            ? 'bg-tertiary-container/40 text-tertiary border-tertiary/40 font-bold'
                            : 'bg-surface-container-high text-on-surface-variant border-transparent hover:text-on-surface'
                        }`}
                      >
                        {b >= 1000 ? `${b / 1000}k` : b}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSummarize}
                      onChange={(e) => setAutoSummarize(e.target.checked)}
                      className="accent-primary"
                    />
                    <span className="text-[11px] text-on-surface">
                      Automatically generate summary pills for older turns when budget is reached
                    </span>
                  </label>
                </div>

                {/* 3. Security Status Badges */}
                <div className="p-space-md rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-space-md">
                    <Icon name="lock" size={20} className="text-tertiary" />
                    <div className="flex flex-col">
                      <span className="text-on-surface font-medium">OS SafeStorage Keyring</span>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        Windows DPAPI / macOS Keychain hardware-backed encryption
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-mono text-[10px]">
                    ACTIVE
                  </span>
                </div>

                <div className="p-space-md rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-space-md">
                    <Icon name="visibility_off" size={20} className="text-primary" />
                    <div className="flex flex-col">
                      <span className="text-on-surface font-medium">Secret Redactor Pipeline</span>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        Automated regex masks API keys &amp; bearer headers in logs and telemetry
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-primary-container/30 text-primary font-mono text-[10px]">
                    PROTECTED
                  </span>
                </div>

                {/* 4. Audit Log Retention & DB Purge */}
                <div className="p-space-md rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-space-md">
                    <Icon name="history" size={20} className="text-on-surface-variant" />
                    <div className="flex flex-col">
                      <span className="text-on-surface font-medium">Audit History Retention</span>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        Auto-clean conversation and tool call logs older than:
                      </span>
                    </div>
                  </div>
                  <select
                    value={auditRetentionDays}
                    onChange={(e) => setAuditRetentionDays(Number(e.target.value))}
                    className="bg-surface-container-high text-on-surface px-2.5 py-1 rounded text-xs font-mono border border-outline-variant/30 focus:outline-none"
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={0}>Forever (No Cleanup)</option>
                  </select>
                </div>

                {/* 5. Purge DB Button */}
                <div className="p-space-md rounded-lg bg-surface-container flex items-center justify-between border border-error/30 mt-space-sm">
                  <div className="flex items-center gap-space-md">
                    <Icon name="delete_forever" size={20} className="text-error" />
                    <div className="flex flex-col">
                      <span className="text-on-surface font-medium">Purge Local SQLite Database</span>
                      <span className="text-[11px] text-on-surface-variant">
                        Permanently deletes conversation history and cached tokens. Credentials remain in safe storage.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handlePurgeDb}
                    className="px-space-md py-1 rounded bg-error/20 hover:bg-error text-error hover:text-on-error font-medium transition-colors text-xs"
                  >
                    Purge DB
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsView

