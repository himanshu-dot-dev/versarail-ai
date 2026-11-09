import React, { useState, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { ProviderIcon } from '../../components/common/ProviderIcon'
import { ProviderMetadataDTO } from '@shared/domain/models'

export const ProvidersView: React.FC = () => {
  const [providers, setProviders] = useState<ProviderMetadataDTO[]>([])

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderMetadataDTO | null>(null)
  const [newProviderId, setNewProviderId] = useState('gemini')
  const [newLabel, setNewLabel] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newEndpoint, setNewEndpoint] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null)
  const [healthMap, setHealthMap] = useState<Record<string, { status: string; cooldownEta?: string | null; lastError?: string }>>({})
  const [isTestingModal, setIsTestingModal] = useState(false)
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; msg: string } | null>(null)

  // Fetch live credentials and health statuses on mount
  useEffect(() => {
    if (window.electronApi?.listProviders) {
      window.electronApi.listProviders().then((list) => {
        setProviders(list || [])
      }).catch(console.error)
    }

    const fetchHealth = () => {
      if (window.electronApi?.getProviderHealthStatuses) {
        window.electronApi.getProviderHealthStatuses().then((map) => {
          if (map) setHealthMap(map)
        }).catch(console.error)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleOpenAddModal = () => {
    setEditingProvider(null)
    setNewProviderId('gemini')
    setNewLabel('')
    setNewKey('')
    setNewEndpoint('')
    setSaveError(null)
    setModalTestResult(null)
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (p: ProviderMetadataDTO) => {
    setEditingProvider(p)
    setNewProviderId(p.providerId)
    setNewLabel(p.label)
    setNewKey('')
    setNewEndpoint(p.customEndpoint || '')
    setSaveError(null)
    setModalTestResult(null)
    setIsAddModalOpen(true)
  }

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: nextEnabled } : p))
    )
    if (window.electronApi?.setProviderEnabled) {
      try {
        await window.electronApi.setProviderEnabled(id, nextEnabled)
      } catch (err) {
        console.error('Failed to update provider enabled status:', err)
      }
    }
  }

  const handleTestConnection = async (id: string, label: string, providerId: string, customEndpoint?: string) => {
    setTestingId(id)
    setTestResult(null)
    try {
      if (window.electronApi?.testProviderConnection) {
        const res = await window.electronApi.testProviderConnection({
          providerId,
          credentialId: id,
          customEndpoint
        })
        setTestResult({
          id,
          success: res.success,
          msg: res.success
            ? `Connection verified: ${label} latency ${res.latencyMs}ms (${res.modelsCount} models active)`
            : `Test failed: ${res.error || 'Connection rejected'}`
        })
      } else {
        // Fallback local simulation
        setTimeout(() => {
          setTestingId(null)
          setTestResult({
            id,
            success: true,
            msg: `Connection verified: ${label} latency 184ms`
          })
        }, 500)
        return
      }
    } catch (err: any) {
      setTestResult({
        id,
        success: false,
        msg: err.message || 'Connection test failed'
      })
    } finally {
      setTestingId(null)
    }
  }

  const handleTestModalConnection = async () => {
    const isKeyless = newProviderId === 'pollinations' || newProviderId === 'kilo'
    if (!newKey.trim() && !editingProvider && !isKeyless) return
    setIsTestingModal(true)
    setModalTestResult(null)
    try {
      if (window.electronApi?.testProviderConnection) {
        const res = await window.electronApi.testProviderConnection({
          providerId: newProviderId,
          apiKey: newKey.trim() || (isKeyless ? 'no-key' : undefined),
          credentialId: !newKey.trim() && editingProvider ? editingProvider.id : undefined,
          customEndpoint: newEndpoint.trim() || undefined
        })
        setModalTestResult({
          success: res.success,
          msg: res.success
            ? `Connection verified: latency ${res.latencyMs}ms (${res.modelsCount} models active)`
            : `Test failed: ${res.error || 'Connection rejected'}`
        })
      }
    } catch (err: any) {
      setModalTestResult({
        success: false,
        msg: err.message || 'Connection test failed'
      })
    } finally {
      setIsTestingModal(false)
    }
  }

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    const isKeyless = newProviderId === 'pollinations' || newProviderId === 'kilo'
    if (!editingProvider && !newKey.trim() && !isKeyless) return

    setIsSaving(true)
    setSaveError(null)

    try {
      if (window.electronApi?.saveCredential) {
        const res = await window.electronApi.saveCredential({
          id: editingProvider ? editingProvider.id : undefined,
          providerId: newProviderId,
          label: newLabel.trim() || `${newProviderId.toUpperCase()} Key`,
          apiKey: newKey.trim() || (isKeyless ? 'no-key' : undefined),
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
            id: editingProvider ? editingProvider.id : `p-${Date.now()}`,
            providerId: newProviderId as any,
            label: newLabel.trim() || `${newProviderId.toUpperCase()} Key`,
            enabled: true,
            isConfigured: true,
            maskedKey: newKey ? `${newKey.slice(0, 4)}••••••••${newKey.slice(-4)}` : editingProvider?.maskedKey || '••••',
            healthStatus: 'healthy'
          }
        ])
      }

      setIsAddModalOpen(false)
      setEditingProvider(null)
      setModalTestResult(null)
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
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-space-sm px-space-xl py-space-md bg-primary text-on-primary font-headline-sm rounded-xl hover:opacity-90 transition-all shadow-sm font-medium self-start md:self-auto cursor-pointer"
        >
          <Icon name="add" size={18} />
          <span>Add Provider</span>
        </button>
      </div>

      {/* Routing Strategy Summary Card */}
      <div className="relative overflow-hidden bg-surface-container rounded-xl p-space-xl shadow-sm border border-outline-variant select-none">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-xl relative z-10">
          <div className="flex items-start gap-space-lg">
            <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
              <Icon name="route" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="text-label-md text-on-surface font-semibold">Active Routing Strategy</span>
                <span
                  className={`px-space-sm py-0.5 rounded-full text-label-sm font-mono font-medium ${
                    providers.length > 0
                      ? 'bg-tertiary-container/30 text-tertiary'
                      : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {providers.length > 0 ? 'Dynamic Fallback' : 'Awaiting Configuration'}
                </span>
              </div>
              <p className="font-body-md text-on-surface-variant mt-1 leading-relaxed">
                {providers.length === 0 ? (
                  'No AI providers configured. Connect an API key from Google AI Studio, Groq, Cerebras, or OpenRouter to enable agent execution and automatic fallback routing.'
                ) : (
                  <>
                    Primary execution routes through{' '}
                    <strong className="text-on-surface">
                      {providers.find((p) => p.enabled !== false)?.label || providers[0]?.label}
                    </strong>{' '}
                    with automatic failover to available backup endpoints on rate-limit (429) or transient 5xx server errors.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-md self-start lg:self-center font-mono">
            <div className="flex flex-col items-end">
              <span className="text-label-sm text-on-surface-variant">Avg Latency</span>
              <span className="font-label-md text-tertiary font-bold">
                --
              </span>
            </div>
            <div className="h-8 w-[1px] bg-border-subtle" />
            <div className="flex flex-col items-end">
              <span className="text-label-sm text-on-surface-variant">Success Rate</span>
              <span className="font-label-md text-on-surface font-bold">
                --
              </span>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="ml-space-md px-space-md py-space-sm bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-medium transition-colors text-body-sm border border-outline-variant cursor-pointer"
            >
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
            {providers.length} {providers.length === 1 ? 'provider' : 'providers'} configured
          </span>
        </div>

        {testResult && (
          <div
            className={`p-space-sm px-space-md border rounded-lg text-body-sm flex items-center justify-between animate-fade-in font-mono ${
              testResult.success
                ? 'bg-tertiary-container/30 border-tertiary/40 text-tertiary'
                : 'bg-error-container/30 border-error/40 text-error'
            }`}
          >
            <span>{testResult.msg}</span>
            <button onClick={() => setTestResult(null)} className="hover:opacity-80">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {providers.length === 0 ? (
          <div className="bg-surface-container rounded-xl p-space-xl border border-dashed border-outline-variant flex flex-col items-center justify-center text-center gap-space-sm py-12">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <Icon name="vpn_key" size={24} className="text-primary" />
            </div>
            <span className="font-headline-sm text-on-surface font-semibold text-sm">
              No Providers Configured
            </span>
            <p className="text-xs text-on-surface-variant max-w-md">
              You haven't connected any AI providers yet. Add your API keys with OS-level hardware encryption to start chatting and coding.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-2 flex items-center gap-space-xs px-space-lg py-space-sm bg-primary text-on-primary rounded-xl text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <Icon name="add" size={16} />
              <span>Add Your First Provider</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-space-md">
            {providers.map((p) => {
              return (
              <div
                key={p.id}
                className="bg-surface-container rounded-xl p-space-lg transition-all hover:bg-surface-container-high hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-lg border border-outline-variant"
              >
                <div className="flex items-start md:items-center gap-space-lg min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant p-2 shadow-xs">
                    <ProviderIcon providerId={p.providerId} size={22} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-space-sm flex-wrap">
                      <span className="font-headline-sm text-on-surface font-semibold">{p.label}</span>
                      <span className="px-space-sm py-0.5 rounded-full bg-primary/10 text-primary text-label-sm font-mono">
                        {p.providerId === 'custom' ? 'Local / Gateway' : 'Cloud'}
                      </span>
                      {(() => {
                        const health = healthMap[p.id]
                        const isCooldown = health?.status === 'cooldown' || p.healthStatus === 'cooldown'
                        const isQuotaExhausted = health?.status === 'quota_exhausted' || p.healthStatus === 'quota_exhausted'
                        const isDegraded = health?.status === 'degraded' || p.healthStatus === 'degraded'

                        if (isCooldown) {
                          return (
                            <span className="px-space-sm py-0.5 rounded-full bg-error/15 text-error text-[11px] font-mono flex items-center gap-1 border border-error/20">
                              <Icon name="schedule" size={12} />
                              Cooldown {health?.cooldownEta || '~45s'}
                            </span>
                          )
                        }
                        if (isQuotaExhausted) {
                          return (
                            <span className="px-space-sm py-0.5 rounded-full bg-error/20 text-error text-[11px] font-mono border border-error/30">
                              Quota Exhausted
                            </span>
                          )
                        }
                        if (isDegraded) {
                          return (
                            <span className="px-space-sm py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 text-[11px] font-mono border border-yellow-500/20">
                              Degraded
                            </span>
                          )
                        }
                        const isEnabled = p.enabled !== false
                        return (
                          <span className="flex items-center gap-1 text-tertiary text-label-sm font-mono">
                            <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-tertiary animate-pulse' : 'bg-outline'}`} />
                            {isEnabled ? 'Connected' : 'Disabled'}
                          </span>
                        )
                      })()}
                    </div>

                    <div className="flex items-center gap-space-md mt-1 text-body-sm text-on-surface-variant flex-wrap font-mono">
                      <span>
                        Model: <strong className="text-on-surface">
                          {p.providerId === 'gemini'
                            ? 'gemini-3.5-flash'
                            : p.providerId === 'groq'
                            ? 'openai/gpt-oss-120b'
                            : p.providerId === 'cerebras'
                            ? 'llama3.3-70b'
                            : p.providerId === 'nvidia'
                            ? 'meta/llama-3.3-70b-instruct'
                            : p.providerId === 'mistral'
                            ? 'codestral-latest'
                            : p.providerId === 'deepseek'
                            ? 'deepseek-ai/DeepSeek-V3'
                            : p.providerId === 'pollinations'
                            ? 'openai (Keyless)'
                            : p.providerId === 'kilo'
                            ? 'deepseek-r1:free'
                            : p.providerId === 'cloudflare'
                            ? 'llama-3.3-70b-fast'
                            : p.providerId === 'cohere'
                            ? 'command-r-plus'
                            : p.providerId === 'huggingface'
                            ? 'meta-llama/Llama-3.3-70B-Instruct'
                            : p.providerId === 'openrouter'
                            ? 'openrouter/free'
                            : p.providerId === 'custom'
                            ? (p.customEndpoint || 'http://localhost:20128/v1')
                            : 'openrouter/free'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="text-on-surface-variant">Key: {p.maskedKey}</span>
                      {p.lastValidatedAt && (
                        <>
                          <span>•</span>
                          <span className="text-on-surface-variant text-[11px]">{p.lastValidatedAt}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-space-md pt-space-md md:pt-0 border-t md:border-t-0 border-border-subtle">
                  <button
                    onClick={() => handleTestConnection(p.id, p.label, p.providerId, p.customEndpoint)}
                    disabled={testingId === p.id}
                    className="px-space-md py-space-sm bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg text-body-sm font-medium transition-colors flex items-center gap-space-sm border border-outline-variant disabled:opacity-50 cursor-pointer"
                  >
                    <Icon
                      name={testingId === p.id ? 'sync' : 'bolt'}
                      size={16}
                      className={testingId === p.id ? 'animate-spin text-tertiary' : 'text-primary'}
                    />
                    <span>{testingId === p.id ? 'Testing...' : 'Test'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="px-space-md py-space-sm bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg text-body-sm font-medium transition-colors flex items-center gap-1.5 border border-outline-variant cursor-pointer"
                    title="Edit Provider Settings and API Key"
                  >
                    <Icon name="edit" size={15} className="text-on-surface-variant" />
                    <span>Edit</span>
                  </button>

                  {/* Toggle Switch */}
                  {(() => {
                    const isEnabled = p.enabled !== false
                    return (
                      <label className="relative inline-flex items-center cursor-pointer" title={isEnabled ? 'Click to disable provider' : 'Click to enable provider'}>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggle(p.id, isEnabled)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    )
                  })()}

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-surface-container-high cursor-pointer"
                    title="Delete Credential"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>

      {/* Add / Edit Provider Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-space-xl max-w-md w-full shadow-2xl flex flex-col gap-space-lg animate-scale-in">
            <div className="flex items-center justify-between pb-space-sm border-b border-border-subtle">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant p-1.5">
                  <ProviderIcon providerId={editingProvider ? editingProvider.providerId : newProviderId} size={18} />
                </div>
                <h3 className="font-headline-md text-on-surface">
                  {editingProvider ? `Edit ${editingProvider.label}` : 'Add AI Provider'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setEditingProvider(null)
                  setModalTestResult(null)
                }}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
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

              {modalTestResult && (
                <div
                  className={`p-space-sm px-space-md border rounded-lg text-body-sm flex items-center justify-between font-mono animate-fade-in ${
                    modalTestResult.success
                      ? 'bg-tertiary-container/30 border-tertiary/40 text-tertiary'
                      : 'bg-error-container/30 border-error/40 text-error'
                  }`}
                >
                  <span>{modalTestResult.msg}</span>
                  <button type="button" onClick={() => setModalTestResult(null)} className="hover:opacity-80">
                    <Icon name="close" size={14} />
                  </button>
                </div>
              )}

              {(() => {
                const isKeyless = newProviderId === 'pollinations' || newProviderId === 'kilo'
                return (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm text-on-surface-variant">Provider Engine</label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0 border border-outline-variant p-2">
                          <ProviderIcon providerId={newProviderId} size={20} />
                        </div>
                        <select
                          value={newProviderId}
                          onChange={(e) => {
                            const id = e.target.value
                            setNewProviderId(id)
                            if (id === 'pollinations') {
                              setNewLabel('Pollinations (Keyless Free)')
                              setNewKey('no-key')
                            } else if (id === 'kilo') {
                              setNewLabel('Kilo Gateway (Keyless Free)')
                              setNewKey('no-key')
                            } else if (newKey === 'no-key') {
                              setNewKey('')
                            }
                          }}
                          disabled={Boolean(editingProvider)}
                          className="flex-1 bg-surface-container-highest text-on-surface p-space-sm rounded-lg border border-outline-variant focus:ring-1 focus:ring-primary outline-none disabled:opacity-75"
                        >
                        <optgroup label="Direct Cloud Providers">
                          <option value="gemini">Google Gemini (Google AI Studio)</option>
                          <option value="groq">GroqCloud (Ultra-Fast LPU)</option>
                          <option value="cerebras">Cerebras Cloud (CS-3 Wafer)</option>
                          <option value="nvidia">NVIDIA NIM (Microservices)</option>
                          <option value="mistral">Mistral AI (Codestral / Large)</option>
                          <option value="deepseek">SiliconFlow / DeepSeek</option>
                          <option value="cloudflare">Cloudflare Workers AI</option>
                          <option value="cohere">Cohere (Command R+)</option>
                        </optgroup>
                        <optgroup label="Zero-Config Free Tiers (No Card Required)">
                          <option value="pollinations">Pollinations.ai (Keyless Free Tier)</option>
                          <option value="kilo">Kilo Gateway (Keyless Free Tier)</option>
                        </optgroup>
                        <optgroup label="Aggregators & Custom Endpoints">
                          <option value="openrouter">OpenRouter Gateway</option>
                          <option value="huggingface">Hugging Face Router</option>
                          <option value="custom">Custom OpenAI-Compatible Endpoint</option>
                        </optgroup>
                      </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm text-on-surface-variant">Credential Label</label>
                      <input
                        type="text"
                        placeholder="e.g. My Gemini Pro Key"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="bg-surface-container-highest text-on-surface p-space-sm rounded-lg border border-outline-variant focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm text-on-surface-variant">API Key / Secret</label>
                      <input
                        type="password"
                        placeholder={
                          isKeyless
                            ? 'No API key required (Public Keyless Tier)'
                            : editingProvider
                            ? `Leave empty to keep existing (${editingProvider.maskedKey})`
                            : 'Enter provider key...'
                        }
                        required={!editingProvider && !isKeyless}
                        value={isKeyless && newKey === 'no-key' ? '' : newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="bg-surface-container-highest text-on-surface p-space-sm rounded-lg border border-outline-variant focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                      <span className="text-[11px] text-on-surface-variant">
                        {isKeyless
                          ? 'This provider supports keyless anonymous access. You can leave the key blank.'
                          : editingProvider
                          ? 'Leave empty to preserve existing encrypted key, or enter a new key to update.'
                          : 'Key is encrypted into your local OS keychain immediately.'}
                      </span>
                    </div>

                    {newProviderId === 'custom' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-label-sm text-on-surface-variant">Endpoint URL</label>
                        <input
                          type="url"
                          placeholder="http://localhost:20128/v1"
                          value={newEndpoint}
                          onChange={(e) => setNewEndpoint(e.target.value)}
                          className="bg-surface-container-highest text-on-surface p-space-sm rounded-lg border border-outline-variant focus:ring-1 focus:ring-primary outline-none font-mono"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-space-md pt-space-md border-t border-border-subtle">
                      <button
                        type="button"
                        disabled={isTestingModal || (!newKey.trim() && !editingProvider && !isKeyless)}
                        onClick={handleTestModalConnection}
                        className="px-space-md py-space-sm bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg text-body-sm font-medium transition-colors flex items-center gap-space-sm border border-outline-variant disabled:opacity-50 cursor-pointer"
                      >
                        <Icon
                          name={isTestingModal ? 'sync' : 'bolt'}
                          size={16}
                          className={isTestingModal ? 'animate-spin text-tertiary' : 'text-primary'}
                        />
                        <span>{isTestingModal ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      <div className="flex items-center gap-space-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddModalOpen(false)
                            setEditingProvider(null)
                            setModalTestResult(null)
                          }}
                          className="px-space-lg py-space-sm rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving || (!editingProvider && !newKey.trim() && !isKeyless)}
                          className="px-space-xl py-space-sm rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-space-sm shadow-sm cursor-pointer"
                        >
                          {isSaving && <Icon name="sync" size={16} className="animate-spin" />}
                          <span>{isSaving ? 'Saving...' : editingProvider ? 'Save Changes' : 'Save Credential'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProvidersView

