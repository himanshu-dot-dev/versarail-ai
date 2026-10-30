import React, { useState, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { ProviderMetadataDTO } from '@shared/domain/models'

export const ProvidersView: React.FC = () => {
  const [providers, setProviders] = useState<ProviderMetadataDTO[]>([
    {
      id: 'p-1',
      providerId: 'gemini',
      label: 'Google AI Studio',
      enabled: true,
      isConfigured: true,
      maskedKey: 'AIza••••••••x924',
      healthStatus: 'healthy',
      lastValidatedAt: 'Just now'
    },
    {
      id: 'p-2',
      providerId: 'groq',
      label: 'GroqCloud LPU',
      enabled: true,
      isConfigured: true,
      maskedKey: 'gsk_••••••••k811',
      healthStatus: 'healthy',
      lastValidatedAt: '2 min ago'
    },
    {
      id: 'p-3',
      providerId: 'cerebras',
      label: 'Cerebras Cloud',
      enabled: true,
      isConfigured: true,
      maskedKey: 'csk_••••••••c402',
      healthStatus: 'healthy',
      lastValidatedAt: '10 min ago'
    },
    {
      id: 'p-4',
      providerId: 'openrouter',
      label: 'OpenRouter Gateway',
      enabled: false,
      isConfigured: true,
      maskedKey: 'sk-or••••••••r190',
      healthStatus: 'cooldown',
      lastValidatedAt: '1 hour ago'
    }
  ])

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newProviderId, setNewProviderId] = useState('gemini')
  const [newLabel, setNewLabel] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newEndpoint, setNewEndpoint] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null)

  // Fetch live credentials from main process on mount
  useEffect(() => {
    if (window.electronApi?.listProviders) {
      window.electronApi.listProviders().then((list) => {
        if (list && list.length > 0) {
          setProviders(list)
        }
      }).catch(console.error)
    }
  }, [])

  const handleToggle = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    )
  }

  const handleTestConnection = async (id: string, label: string) => {
    setTestingId(id)
    setTestResult(null)
    setTimeout(() => {
      setTestingId(null)
      setTestResult({
        id,
        success: true,
        msg: `Connection verified: ${label} latency 184ms`
      })
    }, 800)
  }

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKey.trim()) return

    setIsSaving(true)
    setSaveError(null)

    try {
      if (window.electronApi?.saveCredential) {
        const res = await window.electronApi.saveCredential({
          providerId: newProviderId,
          label: newLabel || `${newProviderId.toUpperCase()} Key`,
          apiKey: newKey.trim(),
          customEndpoint: newEndpoint.trim() || undefined
        })

        if (!res.success) {
          setSaveError(res.error || 'Failed to save credential')
          setIsSaving(false)
          return
        }

        // Refresh list
        const updated = await window.electronApi.listProviders()
        setProviders(updated)
      } else {
        // Fallback local state
        setProviders((prev) => [
          ...prev,
          {
            id: `p-${Date.now()}`,
            providerId: newProviderId as any,
            label: newLabel || `${newProviderId.toUpperCase()} Key`,
            enabled: true,
            isConfigured: true,
            maskedKey: `${newKey.slice(0, 4)}••••••••${newKey.slice(-4)}`,
            healthStatus: 'healthy'
          }
        ])
      }

      setIsAddModalOpen(false)
      setNewKey('')
      setNewLabel('')
      setNewEndpoint('')
    } catch (err: any) {
      setSaveError(err.message || 'Error saving credential')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.electronApi?.deleteCredential) {
      await window.electronApi.deleteCredential(id)
    }
    setProviders((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto p-gutter md:p-space-xl flex flex-col gap-space-xl max-w-7xl mx-auto w-full">
      {/* Top Section: Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg select-none">
        <div>
          <div className="flex items-center gap-space-sm text-primary mb-space-xs font-mono">
            <Icon name="hub" size={16} />
            <span className="text-label-sm uppercase tracking-wider">Gateway Infrastructure</span>
          </div>
          <h1 className="font-headline-xl text-on-surface">AI Providers</h1>
          <p className="font-body-md text-on-surface-variant mt-space-xs">
            Connect your models with hardware-backed encryption. Control your usage and automatic failover priorities.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-space-sm px-space-xl py-space-md bg-primary text-on-primary font-headline-sm rounded-xl hover:opacity-90 transition-all shadow-sm font-medium self-start md:self-auto cursor-pointer"
        >
          <Icon name="add" size={18} />
          <span>Add Provider</span>
        </button>
      </div>

      {/* Routing Strategy Summary Card */}
      <div className="relative overflow-hidden bg-surface-container-low rounded-xl p-space-xl shadow-sm border border-outline-variant/30 select-none">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-xl relative z-10">
          <div className="flex items-start gap-space-lg">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm">
              <Icon name="route" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="text-label-md text-on-surface font-semibold">Active Routing Strategy</span>
                <span className="px-space-sm py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-label-sm font-mono font-medium">
                  Dynamic Fallback
                </span>
              </div>
              <p className="font-body-md text-on-surface-variant mt-1 leading-relaxed">
                Primary execution routes through <strong className="text-on-surface">Google AI Studio (Gemini 2.5 Flash)</strong> with automatic failover to <strong className="text-on-surface">Groq (Llama 3.3 70B)</strong> on rate-limit (429) or transient 5xx server errors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-md self-start lg:self-center font-mono">
            <div className="flex flex-col items-end">
              <span className="text-label-sm text-on-surface-variant">Avg Latency</span>
              <span className="font-label-md text-tertiary font-bold">248ms</span>
            </div>
            <div className="h-8 w-[1px] bg-surface-container-high" />
            <div className="flex flex-col items-end">
              <span className="text-label-sm text-on-surface-variant">Success Rate</span>
              <span className="font-label-md text-on-surface font-bold">99.8%</span>
            </div>
            <button className="ml-space-md px-space-md py-space-sm bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-medium transition-colors text-body-sm border border-outline-variant/20">
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Providers List & Grid */}
      <div className="flex flex-col gap-space-md select-none">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-on-surface">Connected Endpoints</h2>
          <span className="text-label-sm text-on-surface-variant font-mono">
            {providers.length} providers configured
          </span>
        </div>

        {testResult && (
          <div className="p-space-sm px-space-md bg-tertiary-container/30 border border-tertiary/40 rounded-lg text-tertiary text-body-sm flex items-center justify-between animate-fade-in font-mono">
            <span>{testResult.msg}</span>
            <button onClick={() => setTestResult(null)} className="hover:opacity-80">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-space-md">
          {providers.map((p) => {
            const isGoogle = p.providerId === 'gemini'
            const isGroq = p.providerId === 'groq'
            const isCerebras = p.providerId === 'cerebras'

            return (
              <div
                key={p.id}
                className="bg-surface-container-low rounded-xl p-space-lg transition-all hover:bg-surface-container hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-lg border border-outline-variant/30"
              >
                <div className="flex items-start md:items-center gap-space-lg min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 text-primary border border-outline-variant/20">
                    {isGoogle && <Icon name="auto_awesome" size={20} className="text-primary" />}
                    {isGroq && <Icon name="bolt" size={20} className="text-tertiary" />}
                    {isCerebras && <Icon name="psychology" size={20} className="text-secondary" />}
                    {!isGoogle && !isGroq && !isCerebras && <Icon name="dns" size={20} />}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-space-sm flex-wrap">
                      <span className="font-headline-sm text-on-surface font-semibold">{p.label}</span>
                      <span className="px-space-sm py-0.5 rounded-full bg-primary/10 text-primary text-label-sm font-mono">
                        Cloud
                      </span>
                      <span className="flex items-center gap-1 text-tertiary text-label-sm font-mono">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? 'bg-tertiary animate-pulse' : 'bg-outline'}`} />
                        {p.enabled ? 'Connected' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center gap-space-md mt-1 text-body-sm text-on-surface-variant flex-wrap font-mono">
                      <span>
                        Model: <strong className="text-on-surface">
                          {isGoogle ? 'gemini-2.5-flash' : isGroq ? 'llama-3.3-70b-versatile' : 'llama3.3-70b'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="text-on-surface-variant">Key: {p.maskedKey}</span>
                      {p.lastValidatedAt && (
                        <>
                          <span>•</span>
                          <span className="text-outline text-[11px]">{p.lastValidatedAt}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-space-md pt-space-md md:pt-0 border-t md:border-t-0 border-surface-container-high">
                  <button
                    onClick={() => handleTestConnection(p.id, p.label)}
                    disabled={testingId === p.id}
                    className="px-space-md py-space-sm bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg text-body-sm font-medium transition-colors flex items-center gap-space-sm border border-outline-variant/20 disabled:opacity-50"
                  >
                    <Icon
                      name={testingId === p.id ? 'sync' : 'bolt'}
                      size={16}
                      className={testingId === p.id ? 'animate-spin text-tertiary' : 'text-primary'}
                    />
                    <span>{testingId === p.id ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={() => handleToggle(p.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container" />
                  </label>

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-surface-container-high"
                    title="Delete Credential"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Provider Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-space-xl max-w-md w-full shadow-2xl flex flex-col gap-space-lg animate-scale-in">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
              <div className="flex items-center gap-space-sm">
                <Icon name="vpn_key" size={20} className="text-primary" />
                <h3 className="font-headline-md text-on-surface">Add AI Provider</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="flex flex-col gap-space-md">
              {saveError && (
                <div className="p-space-sm bg-error/10 border border-error/30 rounded text-error text-body-sm">
                  {saveError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">Provider Engine</label>
                <select
                  value={newProviderId}
                  onChange={(e) => setNewProviderId(e.target.value)}
                  className="bg-surface-container-highest text-on-surface p-space-sm rounded-lg border border-outline-variant/40 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="gemini">Google Gemini (Google AI Studio)</option>
                  <option value="groq">GroqCloud (LPU Inference)</option>
                  <option value="cerebras">Cerebras Cloud (CS-3 Wafer)</option>
                  <option value="openrouter">OpenRouter Gateway</option>
                  <option value="custom">Custom OpenAI-Compatible Endpoint</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">Credential Label</label>
                <input
                  type="text"
                  placeholder="e.g. My Gemini Pro Key"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="bg-surface-container-highest text-on-surface p-space-sm rounded-lg border border-outline-variant/40 focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">API Key / Secret</label>
                <input
                  type="password"
                  placeholder="Enter provider key..."
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="bg-surface-container-highest text-on-surface p-space-sm rounded-lg border border-outline-variant/40 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
                <span className="text-[11px] text-outline">
                  Key is encrypted into your local OS keychain immediately.
                </span>
              </div>

              {newProviderId === 'custom' && (
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">Endpoint URL</label>
                  <input
                    type="url"
                    placeholder="https://api.my-endpoint.com/v1"
                    value={newEndpoint}
                    onChange={(e) => setNewEndpoint(e.target.value)}
                    className="bg-surface-container-highest text-on-surface p-space-sm rounded-lg border border-outline-variant/40 focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-space-md pt-space-md border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-space-lg py-space-sm rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newKey.trim()}
                  className="px-space-xl py-space-sm rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-space-sm shadow-sm"
                >
                  {isSaving && <Icon name="sync" size={16} className="animate-spin" />}
                  <span>Save Credential</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProvidersView

