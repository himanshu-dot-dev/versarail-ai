import React, { useState, useEffect } from 'react'
import Icon from '../../components/common/Icon'
import { ProviderMetadataDTO } from '@shared/domain/models'

export const UsageQuotasView: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days'>('today')
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
    <div className="flex flex-col w-full p-space-xl gap-space-xl select-none font-sans">
      {/* Top Bar / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-sm mb-space-xs">
            <span className="text-label-sm text-primary tracking-wider uppercase text-[11px] font-mono">
              Telemetry &amp; Billing
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
            Monitor token consumption, request counts, and provider rate limits across all connected models.
          </p>
        </div>

        {/* Time Filter Selector */}
        <div className="flex items-center bg-surface-container-low p-space-xs rounded-xl self-start md:self-auto border border-outline-variant/20">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 days' },
              { id: '30days', label: 'Last 30 days' }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeFilter(item.id)}
              className={`px-space-md py-space-xs rounded-lg text-xs font-medium transition-all ${
                timeFilter === item.id
                  ? 'bg-surface-container-high text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metric Cards (Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
        {/* Total Requests */}
        <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-all border border-outline-variant/20">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant text-[11px]">Total Requests</span>
            <Icon name="dns" size={18} className="text-primary" />
          </div>
          <div>
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">0</div>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="text-label-sm text-on-surface-variant text-[10px]">-- vs last period</span>
            </div>
          </div>
        </div>

        {/* Successful */}
        <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-all border border-outline-variant/20">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-tertiary/5 rounded-full blur-xl group-hover:bg-tertiary/10 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant text-[11px]">Successful</span>
            <Icon name="check_circle" size={18} className="text-tertiary" />
          </div>
          <div>
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">0</div>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="text-label-sm text-on-surface-variant font-mono text-[10px]">
                -- success rate
              </span>
            </div>
          </div>
        </div>

        {/* Failed */}
        <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-all border border-outline-variant/20">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-error/5 rounded-full blur-xl group-hover:bg-error/10 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant text-[11px]">Failed</span>
            <Icon name="error" size={18} className="text-error" />
          </div>
          <div>
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">0</div>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="text-label-sm text-on-surface-variant text-[10px]">0.0% error rate</span>
            </div>
          </div>
        </div>

        {/* Fallback Events */}
        <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-all border border-outline-variant/20">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-secondary/5 rounded-full blur-xl group-hover:bg-secondary/10 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant text-[11px]">Fallback Events</span>
            <Icon name="alt_route" size={18} className="text-secondary" />
          </div>
          <div>
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">0</div>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="text-label-sm text-secondary text-[10px]">0 auto-routed</span>
            </div>
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-all sm:col-span-2 lg:col-span-1 border border-outline-variant/20">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-container/20 rounded-full blur-xl group-hover:bg-primary-container/30 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm text-on-surface-variant text-[11px]">Estimated Cost</span>
            <Icon name="payments" size={18} className="text-primary" />
          </div>
          <div>
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">$0.00</div>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="text-label-sm text-on-surface-variant font-mono text-[10px]">
                BYOK Direct Rates
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout (Split: Usage Breakdown + Telemetry Graph) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-xl">
        {/* Per-Provider Usage Breakdown (2 Columns Wide) */}
        <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-space-xl flex flex-col gap-space-lg border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-on-surface font-semibold text-sm">
                Provider Quota Breakdown
              </h2>
              <p className="font-body-sm text-on-surface-variant text-[11px] mt-0.5">
                Real-time usage limits and consumption per AI gateway connection.
              </p>
            </div>
            <button
              onClick={handleSync}
              className="flex items-center gap-space-xs text-label-sm text-primary hover:underline text-xs cursor-pointer"
            >
              <Icon name="refresh" size={14} className={isSyncing ? 'animate-spin' : ''} />
              Sync Quotas
            </button>
          </div>

          <div className="flex flex-col gap-space-md">
            {providers.length === 0 ? (
              <div className="p-space-xl rounded-xl bg-surface-container flex flex-col items-center justify-center text-center gap-space-xs border border-dashed border-outline-variant/30 py-10">
                <Icon name="query_stats" size={28} className="text-outline" />
                <span className="font-headline-sm text-on-surface font-medium text-xs">
                  No Provider Quotas
                </span>
                <span className="text-[11px] text-on-surface-variant max-w-xs">
                  Connect your API providers to monitor live token quotas, request throughput, and reset times.
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
                    className="bg-surface-container p-space-lg rounded-xl flex flex-col gap-space-md hover:bg-surface-container-high transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-md">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                          <Icon name="dns" size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-space-sm">
                            <span className="font-headline-sm text-on-surface text-xs font-semibold">
                              {p.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-label-sm font-mono text-[10px] ${
                                isCooldown || isQuotaExhausted
                                  ? 'bg-error/20 text-error'
                                  : 'bg-tertiary-container/30 text-tertiary'
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
                            {p.providerId.toUpperCase()} Endpoint
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-body-md text-on-surface text-xs">
                          Active Key Configured
                        </div>
                        <div className="text-label-sm text-on-surface-variant text-[10px]">
                          BYOK Model Rates
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: '0%' }}></div>
                    </div>
                    <div className="flex items-center justify-between text-label-sm text-on-surface-variant text-[10px] font-mono">
                      <span>Rate Limit: Dynamic / Tier Default</span>
                      <span>Hardware DPAPI Encrypted</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Side: Failover & Route Telemetry Panel */}
        <div className="bg-surface-container-low rounded-xl p-space-xl flex flex-col gap-space-md border border-outline-variant/20">
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
            <h3 className="font-headline-sm text-on-surface font-semibold text-xs">
              Recent Failover Events
            </h3>
            <Icon name="alt_route" size={16} className="text-secondary" />
          </div>

          <div className="flex flex-col gap-space-md text-xs">
            <div className="p-space-lg rounded-lg bg-surface-container flex flex-col items-center justify-center text-center gap-space-xs border border-dashed border-outline-variant/30 py-8">
              <Icon name="check_circle" size={24} className="text-tertiary" />
              <span className="text-xs text-on-surface font-medium">All Endpoints Stable</span>
              <span className="text-[11px] text-on-surface-variant max-w-xs">
                No failover events or rate limit recoveries recorded.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UsageQuotasView