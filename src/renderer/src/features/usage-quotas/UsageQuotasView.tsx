import React, { useState } from 'react'
import Icon from '../../components/common/Icon'

export const UsageQuotasView: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days'>('today')
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
    }, 600)
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
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">248,842</div>
            <div className="flex items-center gap-space-xs mt-1">
              <Icon name="trending_up" size={14} className="text-tertiary" />
              <span className="text-label-sm text-tertiary text-[10px]">+12.4% vs last period</span>
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
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">246,109</div>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="text-label-sm text-on-surface-variant font-mono text-[10px]">
                98.9% success rate
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
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">2,733</div>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="text-label-sm text-error text-[10px]">1.1% error rate</span>
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
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">412</div>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="text-label-sm text-secondary text-[10px]">Auto-routed safely</span>
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
            <div className="font-headline-lg text-on-surface font-mono text-xl font-bold">$142.80</div>
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
              className="flex items-center gap-space-xs text-label-sm text-primary hover:underline text-xs"
            >
              <Icon name="refresh" size={14} className={isSyncing ? 'animate-spin' : ''} />
              Sync Quotas
            </button>
          </div>

          <div className="flex flex-col gap-space-md">
            {/* Provider 1: Gemini */}
            <div className="bg-surface-container p-space-lg rounded-xl flex flex-col gap-space-md hover:bg-surface-container-high transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                    <Icon name="neurology" size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-space-sm">
                      <span className="font-headline-sm text-on-surface text-xs font-semibold">
                        Google AI Studio
                      </span>
                      <span className="px-2 py-0.5 rounded text-label-sm bg-tertiary-container/30 text-tertiary font-mono text-[10px]">
                        Healthy
                      </span>
                    </div>
                    <span className="text-body-sm text-on-surface-variant font-mono text-[11px]">
                      gemini-2.5-flash / pro
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-body-md text-on-surface text-xs">
                    1.2M / 4.0M tokens
                  </div>
                  <div className="text-label-sm text-on-surface-variant text-[10px]">30% consumed</div>
                </div>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '30%' }}></div>
              </div>
              <div className="flex items-center justify-between text-label-sm text-on-surface-variant text-[10px] font-mono">
                <span>Rate Limit: 1,000 RPM / 4M TPM</span>
                <span>Tier: Pay-As-You-Go / Free Tier Tier 1</span>
              </div>
            </div>

            {/* Provider 2: Groq */}
            <div className="bg-surface-container p-space-lg rounded-xl flex flex-col gap-space-md hover:bg-surface-container-high transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-secondary">
                    <Icon name="bolt" size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-space-sm">
                      <span className="font-headline-sm text-on-surface text-xs font-semibold">
                        GroqCloud LPU
                      </span>
                      <span className="px-2 py-0.5 rounded text-label-sm bg-tertiary-container/30 text-tertiary font-mono text-[10px]">
                        Available
                      </span>
                    </div>
                    <span className="text-body-sm text-on-surface-variant font-mono text-[11px]">
                      llama-3.3-70b-versatile
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-body-md text-on-surface text-xs">
                    420K / 1.0M tokens
                  </div>
                  <div className="text-label-sm text-on-surface-variant text-[10px]">42% consumed</div>
                </div>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div className="bg-secondary h-full rounded-full" style={{ width: '42%' }}></div>
              </div>
              <div className="flex items-center justify-between text-label-sm text-on-surface-variant text-[10px] font-mono">
                <span>Rate Limit: 30 RPM / 6,000 TPM</span>
                <span>Resets in 48m</span>
              </div>
            </div>

            {/* Provider 3: Cerebras */}
            <div className="bg-surface-container p-space-lg rounded-xl flex flex-col gap-space-md hover:bg-surface-container-high transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-tertiary">
                    <Icon name="speed" size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-space-sm">
                      <span className="font-headline-sm text-on-surface text-xs font-semibold">
                        Cerebras Cloud
                      </span>
                      <span className="px-2 py-0.5 rounded text-label-sm bg-tertiary-container/30 text-tertiary font-mono text-[10px]">
                        Active
                      </span>
                    </div>
                    <span className="text-body-sm text-on-surface-variant font-mono text-[11px]">
                      llama-3.1-70b
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-body-md text-on-surface text-xs">
                    180K / 500K tokens
                  </div>
                  <div className="text-label-sm text-on-surface-variant text-[10px]">36% consumed</div>
                </div>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div className="bg-tertiary h-full rounded-full" style={{ width: '36%' }}></div>
              </div>
              <div className="flex items-center justify-between text-label-sm text-on-surface-variant text-[10px] font-mono">
                <span>Inference: ~1,800 tokens/sec</span>
                <span>Direct Key Configured</span>
              </div>
            </div>
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
            <div className="p-space-md rounded-lg bg-surface-container flex flex-col gap-1 border-l-2 border-secondary">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-secondary font-semibold">RATE LIMIT (429)</span>
                <span className="text-on-surface-variant">14:22:04</span>
              </div>
              <p className="text-on-surface text-[11px]">
                Gemini 2.5 hit RPM quota. Dynamic router switched to <b>Groq Llama 3.3</b>.
              </p>
              <span className="text-[10px] text-tertiary font-mono">Failover latency: 142ms</span>
            </div>

            <div className="p-space-md rounded-lg bg-surface-container flex flex-col gap-1 border-l-2 border-primary">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-primary font-semibold">ROUTE RESTORED</span>
                <span className="text-on-surface-variant">12:15:30</span>
              </div>
              <p className="text-on-surface text-[11px]">
                Cooldown expired for Gemini endpoint. Primary router status: <b>Healthy</b>.
              </p>
              <span className="text-[10px] text-on-surface-variant font-mono">Auto health check: 200 OK</span>
            </div>

            <div className="p-space-md rounded-lg bg-surface-container flex flex-col gap-1 border-l-2 border-secondary">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-secondary font-semibold">TOKEN BUDGET WARNING</span>
                <span className="text-on-surface-variant">Yesterday</span>
              </div>
              <p className="text-on-surface text-[11px]">
                Local budget reached 75% threshold. No disruption to execution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UsageQuotasView

