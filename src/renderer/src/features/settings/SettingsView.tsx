import React, { useState, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { useUiStore } from '../../app/useUiStore'
import { ALL_SUPPORTED_PROVIDERS, DEFAULT_ALLOWED_PROVIDERS } from '@shared/schemas/provider.schema'

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useUiStore()

  const [activeCategory, setActiveCategory] = useState<'appearance' | 'privacy'>('appearance')

  // Privacy & Context Management state
  const [allowedProviders, setAllowedProviders] = useState<string[]>(DEFAULT_ALLOWED_PROVIDERS)
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
          setAllowedProviders(
            res.privacy.allowedProviders && res.privacy.allowedProviders.length > 0
              ? res.privacy.allowedProviders
              : DEFAULT_ALLOWED_PROVIDERS
          )
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

  const handleSelectAll = () => {
    setAllowedProviders(DEFAULT_ALLOWED_PROVIDERS)
  }

  const handleClearAll = () => {
    setAllowedProviders([])
  }

  const handleReset = () => {
    setAllowedProviders(DEFAULT_ALLOWED_PROVIDERS)
    setAuditRetentionDays(30)
    setContextBudgetTokens(32_000)
    setAutoSummarize(true)
    handleSave()
  }

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-2.5rem)] bg-surface text-on-surface select-none font-sans">
      {/* Top Header Bar for Settings Context */}
      <div className="px-space-xl py-space-lg flex items-center justify-between bg-surface-container-lowest border-b border-border-subtle">
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
            Customize interface appearance and configure local privacy, data retention, and provider gating.
          </p>
        </div>

        <div className="flex items-center gap-space-md">
          <button
            onClick={handleReset}
            className="px-space-lg py-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium border border-outline-variant transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-space-lg py-space-sm rounded-lg bg-primary text-on-primary text-xs font-medium hover:opacity-90 transition-all shadow-sm shadow-primary/25 flex items-center gap-1.5"
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
        <aside className="w-64 bg-surface-container-lowest p-space-md flex flex-col gap-space-xs shrink-0 select-none border-r border-border-subtle">
          <div className="text-label-sm text-on-surface-variant px-space-md py-space-sm uppercase tracking-wider text-[10px] font-mono">
            Categories
          </div>
          <nav className="flex flex-col gap-space-xs text-xs">
            {(
              [
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
                      ? 'bg-primary/10 text-on-surface dark:bg-white/[0.08] dark:text-on-surface font-semibold border-l-2 border-primary pl-[14px]'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <Icon
                    name={cat.icon}
                    size={18}
                    className={isActive ? 'text-primary' : 'text-on-surface-variant'}
                  />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Form Content Area */}
        <div className="flex-1 p-space-xl overflow-y-auto max-w-4xl flex flex-col gap-space-xl">
          {/* Appearance Section */}
          {activeCategory === 'appearance' && (
            <section className="flex flex-col gap-space-lg bg-surface-container p-space-xl rounded-xl border border-outline-variant shadow-sm">
              <div className="flex items-center justify-between pb-space-md border-b border-border-subtle">
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
                    className={`flex flex-col gap-space-sm p-space-md rounded-xl cursor-pointer transition-all border ${
                      theme === 'versarail-dark'
                        ? 'border-primary ring-1 ring-primary/40 bg-surface-container-low'
                        : 'border-outline-variant bg-surface-container-low/50 opacity-75 hover:opacity-100 hover:border-outline'
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-[#090a0f] flex flex-col p-2.5 gap-1.5 border border-border-subtle">
                      <div className="w-1/2 h-2 rounded bg-zinc-700"></div>
                      <div className="w-3/4 h-1.5 rounded bg-zinc-800"></div>
                      <div className="w-1/3 h-2 rounded bg-primary mt-auto"></div>
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
                    className={`flex flex-col gap-space-sm p-space-md rounded-xl cursor-pointer transition-all border ${
                      theme === 'light'
                        ? 'border-primary ring-1 ring-primary/40 bg-surface-container-low'
                        : 'border-outline-variant bg-surface-container-low/50 opacity-75 hover:opacity-100 hover:border-outline'
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-[#f8fafc] flex flex-col p-2.5 gap-1.5 border border-slate-300">
                      <div className="w-1/2 h-2 rounded bg-slate-300"></div>
                      <div className="w-3/4 h-1.5 rounded bg-slate-200"></div>
                      <div className="w-1/3 h-2 rounded bg-primary mt-auto"></div>
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
                    className={`flex flex-col gap-space-sm p-space-md rounded-xl cursor-pointer transition-all border ${
                      theme === 'system'
                        ? 'border-primary ring-1 ring-primary/40 bg-surface-container-low'
                        : 'border-outline-variant bg-surface-container-low/50 opacity-75 hover:opacity-100 hover:border-outline'
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-gradient-to-r from-[#090a0f] to-[#f8fafc] flex flex-col p-2.5 gap-1.5 border border-border-subtle">
                      <div className="w-1/2 h-2 rounded bg-white/40"></div>
                      <div className="w-3/4 h-1.5 rounded bg-black/20"></div>
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
            <section className="flex flex-col gap-space-lg bg-surface-container p-space-xl rounded-xl border border-outline-variant shadow-sm">
              <div className="flex items-center justify-between pb-space-md border-b border-border-subtle">
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
                <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <Icon name="policy" size={18} className="text-primary" />
                      <span className="text-on-surface font-medium">Permitted Workspace AI Providers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[10px] text-primary hover:underline font-mono cursor-pointer"
                      >
                        Allow All
                      </button>
                      <span className="text-on-surface-variant/40 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[10px] text-on-surface-variant hover:text-on-surface font-mono cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Failover and agent prompt dispatching will only communicate with checked providers:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ALL_SUPPORTED_PROVIDERS.map((p) => {
                      const isAllowed = allowedProviders.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProvider(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                            isAllowed
                              ? 'bg-primary text-on-primary border-primary/40 font-semibold shadow-xs'
                              : 'bg-surface-container-high text-on-surface-variant border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <Icon name={isAllowed ? 'check' : 'close'} size={14} />
                          <span>{p.label}</span>
                          {p.isKeyless && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-surface-container-lowest/30 uppercase font-mono tracking-wider ml-0.5">
                              Free
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Context Window Budget & Auto-Summarization */}
                <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-space-sm">
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
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border cursor-pointer ${
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
                <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
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

                <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
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
                <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
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
                    className="bg-surface-container-high text-on-surface px-2.5 py-1 rounded text-xs font-mono border border-outline-variant focus:outline-none"
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={0}>Forever (No Cleanup)</option>
                  </select>
                </div>

                {/* 5. Purge DB Button */}
                <div className="p-space-md rounded-lg bg-surface-container-low flex items-center justify-between border border-error/30 mt-space-sm">
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
                    className="px-space-md py-1 rounded bg-error/20 hover:bg-error text-error hover:text-on-error font-medium transition-colors text-xs cursor-pointer"
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
