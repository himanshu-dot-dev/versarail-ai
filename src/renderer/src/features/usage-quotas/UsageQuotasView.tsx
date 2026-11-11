import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../../components/common/Icon'
import { ProviderIcon } from '../../components/common/ProviderIcon'
import { ProviderMetadataDTO, TokenUsageSummaryDTO } from '@shared/domain/models'

const PROVIDER_COLORS: Record<string, string> = {
  gemini: '#38bdf8',
  groq: '#f97316',
  cerebras: '#a855f7',
  openrouter: '#6366f1',
  mistral: '#f59e0b',
  cloudflare: '#fb923c',
  cohere: '#10b981',
  nvidia: '#84cc16',
  deepseek: '#06b6d4',
  huggingface: '#eab308',
  kilo: '#ec4899',
  pollinations: '#14b8a6',
  custom: '#94a3b8'
}

function formatCompactTokens(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return Math.round(n).toLocaleString()
}

export const UsageQuotasView: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [showModelsBreakdown, setShowModelsBreakdown] = useState(false)
  const [providers, setProviders] = useState<ProviderMetadataDTO[]>([])
  const [healthMap, setHealthMap] = useState<Record<string, { status: string; cooldownEta?: string | null }>>({})
  const [tokenSummary, setTokenSummary] = useState<TokenUsageSummaryDTO | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [provList, hMap, tSummary] = await Promise.all([
        window.electronApi?.listProviders ? window.electronApi.listProviders() : Promise.resolve([]),
        window.electronApi?.getProviderHealthStatuses
          ? window.electronApi.getProviderHealthStatuses()
          : Promise.resolve({}),
        window.electronApi?.getTokenUsageSummary
          ? window.electronApi.getTokenUsageSummary()
          : Promise.resolve(null)
      ])
      setProviders(provList || [])
      if (hMap) setHealthMap(hMap)
      if (tSummary) setTokenSummary(tSummary)
    } catch (err) {
      console.error('[UsageQuotasView] Failed loading usage data:', err)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await loadData()
    } finally {
      setTimeout(() => setIsSyncing(false), 350)
    }
  }

  const documentedProviders = useMemo(() => {
    if (!tokenSummary) return []
    return tokenSummary.providers.filter((p) => p.monthlyTokenBudgetTokens > 0)
  }, [tokenSummary])

  const tokenByProvider = useMemo(() => {
    const map: Record<string, TokenUsageSummaryDTO['providers'][number]> = {}
    for (const p of tokenSummary?.providers || []) {
      map[p.providerId] = p
    }
    return map
  }, [tokenSummary])

  const remainingBadgeStyle = useMemo(() => {
    const pct = tokenSummary?.remainingPct ?? 100
    if (pct > 50) return 'text-tertiary border-tertiary/30 bg-tertiary-container/20'
    if (pct > 15) return 'text-amber-400 border-amber-400/30 bg-amber-500/15'
    return 'text-error border-error/30 bg-error/15'
  }, [tokenSummary])

  return (
    <div className="shrink-0 flex flex-col w-full p-space-xl gap-space-xl select-none font-sans max-w-6xl mx-auto">
      {/* Top Bar / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-space-sm mb-space-xs">
            <span className="text-label-sm text-primary tracking-wider uppercase text-[11px] font-mono">
              Telemetry &amp; Token Calculator
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="text-label-sm text-on-surface-variant font-mono text-[11px]">
              NODE-LOCAL-ENGINE
            </span>
          </div>
          <h1 className="font-headline-xl text-on-surface text-2xl font-bold tracking-tight">
            Usage &amp; Quotas
          </h1>
          <p className="font-body-md text-on-surface-variant text-xs mt-0.5">
            Calculate monthly free-tier token capacity, track token usage per provider and model, and monitor endpoint health.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium border border-outline-variant transition-colors self-start md:self-auto cursor-pointer"
        >
          <Icon name="refresh" size={15} className={isSyncing ? 'animate-spin text-primary' : 'text-on-surface-variant'} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Monthly Free-Tier Token Budget Calculator Card */}
      <div className="shrink-0 bg-surface-container-low rounded-xl p-space-xl border border-border-subtle flex flex-col gap-space-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Icon name="coins" size={20} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-on-surface font-semibold text-sm">
                  Monthly Free-Tier Token Calculator
                </h2>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${remainingBadgeStyle}`}>
                  {tokenSummary ? `${tokenSummary.remainingPct.toFixed(1)}% Available` : '—'}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Pool-deduplicated across shared provider quotas and scaled by active API keys ({tokenSummary?.activeProviderCount ?? 0} active providers).
                {tokenSummary && tokenSummary.unpublishedCount > 0
                  ? ` + ${tokenSummary.unpublishedCount} provider(s) with rate-limit/unpublished caps.`
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-on-surface-variant">Monthly Budget</div>
              <div className="text-xl font-bold font-mono text-on-surface">
                {tokenSummary ? formatCompactTokens(tokenSummary.totalMonthlyBudgetTokens) : '0'}
                <span className="text-xs font-normal text-on-surface-variant ml-1">tok</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-on-surface-variant">Used This Month</div>
              <div className="text-xl font-bold font-mono text-amber-400">
                {tokenSummary ? formatCompactTokens(tokenSummary.totalUsedMonthTokens) : '0'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-on-surface-variant">Remaining Free</div>
              <div className="text-xl font-bold font-mono text-tertiary">
                {tokenSummary ? formatCompactTokens(tokenSummary.totalRemainingMonthTokens) : '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Stacked Provider Share Bar */}
        {tokenSummary && tokenSummary.totalMonthlyBudgetTokens > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="w-full h-3 rounded-full bg-surface-container-highest overflow-hidden flex border border-outline-variant/40">
              {documentedProviders.map((prov) => {
                const widthPct = (prov.monthlyTokenBudgetTokens / tokenSummary.totalMonthlyBudgetTokens) * 100
                const color = PROVIDER_COLORS[prov.providerId] || '#6366f1'
                return (
                  <div
                    key={prov.providerId}
                    style={{ width: `${Math.max(widthPct, 0.8)}%`, backgroundColor: color }}
                    className="h-full transition-all border-r border-surface/40 last:border-r-0"
                    title={`${prov.providerName}: ${formatCompactTokens(prov.monthlyTokenBudgetTokens)}/mo (${widthPct.toFixed(1)}%) — ${formatCompactTokens(prov.usedTokensMonth)} used`}
                  />
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                {documentedProviders.map((prov) => {
                  const color = PROVIDER_COLORS[prov.providerId] || '#6366f1'
                  const pct = (prov.monthlyTokenBudgetTokens / tokenSummary.totalMonthlyBudgetTokens) * 100
                  return (
                    <div key={prov.providerId} className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-on-surface font-medium">{prov.providerName}</span>
                      <span>{formatCompactTokens(prov.monthlyTokenBudgetTokens)}</span>
                      <span className="opacity-60">({pct.toFixed(0)}%)</span>
                      {prov.usableKeyCount > 1 && (
                        <span className="px-1 rounded bg-primary/15 text-primary text-[10px]">
                          x{prov.usableKeyCount}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowModelsBreakdown((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-mono text-primary hover:underline cursor-pointer"
              >
                <Icon name={showModelsBreakdown ? 'expand_less' : 'expand_more'} size={14} />
                <span>
                  {showModelsBreakdown ? 'Hide' : 'Show'} Per-Model Budgets ({tokenSummary.models.length})
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-surface-container border border-dashed border-border-subtle text-xs text-on-surface-variant">
            Configure API keys in AI Providers to calculate monthly free token capacity across your endpoints.
          </div>
        )}

        {showModelsBreakdown && tokenSummary && tokenSummary.models.length > 0 && (
          <div className="pt-2 border-t border-border-subtle grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {tokenSummary.models.map((m) => {
              const pctUsed = m.budget > 0 ? Math.min(100, (m.used / m.budget) * 100) : 0
              return (
                <div
                  key={`${m.providerId}:${m.modelId}`}
                  className="p-2.5 rounded-lg bg-surface-container border border-border-subtle flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ProviderIcon providerId={m.providerId} size={14} className="shrink-0" />
                      <span className="text-[11px] font-medium text-on-surface truncate" title={m.modelId}>
                        {m.displayName}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant shrink-0">
                      {m.providerId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
                    <span>
                      Used: <strong className="text-on-surface">{formatCompactTokens(m.used)}</strong> /{' '}
                      {m.budget > 0 ? formatCompactTokens(m.budget) : 'Unpublished'}
                    </span>
                    {m.budget > 0 && (
                      <span className="text-tertiary">{formatCompactTokens(m.remaining)} left</span>
                    )}
                  </div>
                  {m.budget > 0 && (
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pctUsed > 85 ? 'bg-error' : pctUsed > 50 ? 'bg-amber-400' : 'bg-tertiary'}`}
                        style={{ width: `${Math.max(pctUsed, m.used > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Main Content Layout: Provider Token Breakdown & Health + Failover Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-xl">
        {/* Left 2 Columns: Per-Provider Token Calculator & Health */}
        <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-space-xl flex flex-col gap-space-lg border border-border-subtle">
          <div>
            <h2 className="font-headline-md text-on-surface font-semibold text-sm">
              Provider Token Usage &amp; Live Health
            </h2>
            <p className="font-body-sm text-on-surface-variant text-[11px] mt-0.5">
              Monthly token pools, input/output token consumption, and dynamic cooldown status per provider.
            </p>
          </div>

          <div className="flex flex-col gap-space-md">
            {providers.length === 0 && (!tokenSummary || tokenSummary.providers.length === 0) ? (
              <div className="p-space-xl rounded-xl bg-surface-container flex flex-col items-center justify-center text-center gap-space-xs border border-dashed border-border-subtle py-10">
                <Icon name="bar_chart" size={28} className="text-on-surface-variant/60" />
                <span className="font-headline-sm text-on-surface font-medium text-xs">
                  No Providers Configured
                </span>
                <span className="text-[11px] text-on-surface-variant max-w-xs">
                  Configure API keys in AI Providers to activate real-time token calculation and automated failover.
                </span>
              </div>
            ) : (
              <>
                {providers.map((p) => {
                  const health = healthMap[p.id]
                  const isCooldown = health?.status === 'cooldown'
                  const isQuotaExhausted = health?.status === 'quota_exhausted'
                  const tokStats = tokenByProvider[p.providerId]
                  const usedPct =
                    tokStats && tokStats.monthlyTokenBudgetTokens > 0
                      ? Math.min(100, (tokStats.usedTokensMonth / tokStats.monthlyTokenBudgetTokens) * 100)
                      : 0
                  const barColor = PROVIDER_COLORS[p.providerId] || '#6366f1'

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
                            <div className="flex items-center gap-space-sm flex-wrap">
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
                              {tokStats && tokStats.usableKeyCount > 1 && (
                                <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-mono">
                                  x{tokStats.usableKeyCount} keys
                                </span>
                              )}
                            </div>
                            <span className="text-body-sm text-on-surface-variant font-mono text-[11px]">
                              {p.providerId.toUpperCase()} Gateway
                              {tokStats ? ` · Pool: ${tokStats.poolKey}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-xs text-on-surface font-semibold">
                            {tokStats && tokStats.monthlyTokenBudgetTokens > 0
                              ? `${formatCompactTokens(tokStats.remainingTokensMonth)} left`
                              : tokStats?.monthlyBudgetLabel || 'Active'}
                          </div>
                          <div className="text-[10px] text-on-surface-variant">
                            {tokStats && tokStats.monthlyTokenBudgetTokens > 0
                              ? `of ${formatCompactTokens(tokStats.monthlyTokenBudgetTokens)}/mo`
                              : 'Hardware DPAPI Encrypted'}
                          </div>
                        </div>
                      </div>

                      {tokStats && (
                        <div className="flex flex-col gap-1.5">
                          {tokStats.monthlyTokenBudgetTokens > 0 && (
                            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.max(usedPct, tokStats.usedTokensMonth > 0 ? 2 : 0)}%`,
                                  backgroundColor: usedPct > 85 ? '#f87171' : barColor
                                }}
                              />
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-on-surface-variant pt-1 border-t border-border-subtle/40">
                            <span>
                              24h In/Out: {formatCompactTokens(tokStats.inputTokens24h)} /{' '}
                              {formatCompactTokens(tokStats.outputTokens24h)}
                            </span>
                            <span>
                              Month In/Out: {formatCompactTokens(tokStats.inputTokensMonth)} /{' '}
                              {formatCompactTokens(tokStats.outputTokensMonth)}
                            </span>
                            <span>Used: {formatCompactTokens(tokStats.usedTokensMonth)} tok</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Also show any active keyless provider token pools (e.g., Kilo / Pollinations) not in configured credentials list */}
                {tokenSummary?.providers
                  .filter((tp) => !providers.some((p) => p.providerId === tp.providerId))
                  .map((tp) => (
                    <div
                      key={tp.providerId}
                      className="bg-surface-container p-space-lg rounded-xl flex flex-col gap-2 border border-border-subtle/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-md">
                          <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center border border-outline-variant/30 p-2 shrink-0">
                            <ProviderIcon providerId={tp.providerId} size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-headline-sm text-on-surface text-xs font-semibold">
                                {tp.providerName}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary text-[10px] font-mono font-semibold">
                                Keyless Active
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-on-surface-variant">
                              Pool: {tp.poolKey} · {tp.monthlyBudgetLabel}
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[11px] text-on-surface">
                          {formatCompactTokens(tp.usedTokensMonth)} tok used
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant pt-1 border-t border-border-subtle/40">
                        <span>
                          24h In/Out: {formatCompactTokens(tp.inputTokens24h)} / {formatCompactTokens(tp.outputTokens24h)}
                        </span>
                        <span>
                          Month In/Out: {formatCompactTokens(tp.inputTokensMonth)} / {formatCompactTokens(tp.outputTokensMonth)}
                        </span>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Failover & Route Telemetry Panel */}
        <div className="bg-surface-container-low rounded-xl p-space-xl flex flex-col gap-space-md border border-border-subtle self-start">
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
