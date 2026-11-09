import React, { useState, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { ProviderIcon } from '../../components/common/ProviderIcon'
import { ProviderMetadataDTO } from '@shared/domain/models'

export const UsageQuotasView: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [providers, setProviders] = useState<ProviderMetadataDTO[]>([])
  const [healthMap, setHealthMap] = useState<Record<string, { status: string; cooldownEta?: string | null }>>({})

  useEffect(() => {
    if (window.electronApi?.listProviders) {
      window.electronApi.listProviders().then((list) => {
        setProviders(list || [])
      }).catch(console.error)
    }

    if (window.electronApi?.getProviderHealthStatuses) {
      window.electronApi.getProviderHealthStatuses().then((map) => {
        if (map) setHealthMap(map)
      }).catch(console.error)
    }
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      if (window.electronApi?.listProviders) {
        const list = await window.electronApi.listProviders()
        setProviders(list || [])
      }
      if (window.electronApi?.getProviderHealthStatuses) {
        const map = await window.electronApi.getProviderHealthStatuses()
        if (map) setHealthMap(map)
      }
    } finally {
      setTimeout(() => setIsSyncing(false), 400)
    }
  }

  return (
    <div className="flex flex-col w-full p-space-xl gap-space-xl select-none font-sans max-w-6xl">
      {/* Top Bar / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-space-sm mb-space-xs">
            <span className="text-label-sm text-primary tracking-wider uppercase text-[11px] font-mono">
              Telemetry &amp; Provider Health
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="text-label-sm text-on-surface-variant font-mono text-[11px]">
              NODE-LOCAL-ENGINE
            </span>
          </div>
          <h1 className="font-headline-xl text-on-surface text-2xl font-bold tracking-tight">
            Usage &amp; Quotas
          </h1>
          <p className="font-body-md text-on-surface-variant text-xs mt-0.5">
            Monitor real-time provider endpoint health, active cooldown periods, and failover status.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium border border-outline-variant transition-colors self-start md:self-auto cursor-pointer"
        >
          <Icon name="refresh" size={15} className={isSyncing ? 'animate-spin text-primary' : 'text-on-surface-variant'} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Main Content Layout (Split: Provider Health Breakdown + Telemetry) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-xl">
        {/* Live Provider Health & Status (2 Columns Wide) */}
        <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-space-xl flex flex-col gap-space-lg border border-border-subtle">
          <div>
            <h2 className="font-headline-md text-on-surface font-semibold text-sm">
              Live Provider Health &amp; Rate Limit Status
            </h2>
            <p className="font-body-sm text-on-surface-variant text-[11px] mt-0.5">
              Active status and dynamic cooldown recovery for configured AI model gateways.
            </p>
          </div>

          <div className="flex flex-col gap-space-md">
            {providers.length === 0 ? (
              <div className="p-space-xl rounded-xl bg-surface-container flex flex-col items-center justify-center text-center gap-space-xs border border-dashed border-border-subtle py-10">
                <Icon name="query_stats" size={28} className="text-on-surface-variant/60" />
                <span className="font-headline-sm text-on-surface font-medium text-xs">
                  No Providers Configured
                </span>
                <span className="text-[11px] text-on-surface-variant max-w-xs">
                  Configure API keys in Settings to activate real-time health monitoring and automated failover.
                </span>
              </div>
            ) : (
              providers.map((p) => {
                const health = healthMap[p.id]
                const isCooldown = health?.status === 'cooldown'
                const isQuotaExhausted = health?.status === 'quota_exhausted'

                return (
                  <div
                    key={p.id}
                    className="bg-surface-container p-space-lg rounded-xl flex flex-col gap-space-md hover:bg-surface-container-high transition-all border border-border-subtle/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-md">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center border border-outline-variant/30 p-2 shrink-0">
                          <ProviderIcon providerId={p.providerId} size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-space-sm">
                            <span className="font-headline-sm text-on-surface text-xs font-semibold">
                              {p.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-label-sm font-mono text-[10px] font-semibold ${
                                isCooldown || isQuotaExhausted
                                  ? 'bg-error/20 text-error'
                                  : p.enabled
                                  ? 'bg-tertiary-container/30 text-tertiary'
                                  : 'bg-surface-container-highest text-on-surface-variant'
                              }`}
                            >
                              {isCooldown
                                ? `Cooldown (${health?.cooldownEta || '~45s'})`
                                : isQuotaExhausted
                                ? 'Quota Exhausted'
                                : p.enabled
                                ? 'Healthy'
                                : 'Disabled'}
                            </span>
                          </div>
                          <span className="text-body-sm text-on-surface-variant font-mono text-[11px]">
                            {p.providerId.toUpperCase()} Gateway
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-body-md text-on-surface text-xs">
                          {p.enabled ? 'Active Endpoint' : 'Inactive'}
                        </div>
                        <div className="text-label-sm text-on-surface-variant text-[10px]">
                          Hardware DPAPI Encrypted
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-label-sm text-on-surface-variant text-[10px] font-mono pt-1 border-t border-border-subtle/40">
                      <span>Gateway Mode: {p.isConfigured ? 'BYOK Direct' : 'Dynamic Endpoint'}</span>
                      <span>Health Check: Auto-heartbeat</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Side: Failover & Route Telemetry Panel */}
        <div className="bg-surface-container-low rounded-xl p-space-xl flex flex-col gap-space-md border border-border-subtle">
          <div className="flex items-center justify-between pb-space-sm border-b border-border-subtle">
            <h3 className="font-headline-sm text-on-surface font-semibold text-xs">
              Recent Failover Events
            </h3>
            <Icon name="alt_route" size={16} className="text-secondary" />
          </div>

          <div className="flex flex-col gap-space-md text-xs">
            <div className="p-space-lg rounded-lg bg-surface-container flex flex-col items-center justify-center text-center gap-space-xs border border-dashed border-border-subtle py-8">
              <Icon name="check_circle" size={24} className="text-tertiary" />
              <span className="text-xs text-on-surface font-medium">All Endpoints Stable</span>
              <span className="text-[11px] text-on-surface-variant max-w-xs">
                No active failover cascades or rate limit cooldown recoveries in progress.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UsageQuotasView