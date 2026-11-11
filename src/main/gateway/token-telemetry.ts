import { randomUUID } from 'crypto'
import {
  ModelBudgetEntryDTO,
  ProviderId,
  ProviderTokenBreakdownDTO,
  TokenUsageSummaryDTO
} from '@shared/domain/models'
import { SqliteDatabase } from '../storage/sqlite-database'
import {
  getUsableKeyCountsByProvider,
  PROVIDER_DISPLAY_NAMES,
  PROVIDER_MODEL_BUDGET_SPECS
} from './free-model-catalog'
import { classifyBudgetKind, monthlyBudgetScore } from './budget-parser'

export interface RecordTokenUsageInput {
  providerId: ProviderId
  credentialId?: string | null
  modelId: string
  inputTokens: number
  outputTokens: number
  tokenSource: 'upstream' | 'estimated'
}

function getMonthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString()
}

export class TokenTelemetryService {
  private static instance: TokenTelemetryService | null = null

  private constructor() {}

  public static getInstance(): TokenTelemetryService {
    if (!TokenTelemetryService.instance) {
      TokenTelemetryService.instance = new TokenTelemetryService()
    }
    return TokenTelemetryService.instance
  }

  public static resetInstance(): void {
    TokenTelemetryService.instance = null
  }

  private get db(): SqliteDatabase {
    return SqliteDatabase.getInstance()
  }

  public recordUsage(input: RecordTokenUsageInput): void {
    try {
      const inputTokens = Math.max(0, Math.round(input.inputTokens || 0))
      const outputTokens = Math.max(0, Math.round(input.outputTokens || 0))
      const totalTokens = inputTokens + outputTokens
      if (totalTokens === 0) return

      this.db
        .prepare(
          `INSERT INTO token_usage_logs (
            id, provider_id, credential_id, model_id,
            input_tokens, output_tokens, total_tokens, token_source, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          randomUUID(),
          input.providerId,
          input.credentialId || null,
          input.modelId,
          inputTokens,
          outputTokens,
          totalTokens,
          input.tokenSource,
          new Date().toISOString()
        )
    } catch {
      // Never abort chat completion on telemetry failure
    }
  }

  /**
   * Computes pool-deduplicated, usable-key-scaled monthly free token budgets and actual token usage
   * for each active provider and model.
   */
  public getTokenUsageSummary(): TokenUsageSummaryDTO {
    const now = new Date()
    const monthStartIso = getMonthStartIso(now)
    const dayStartIso = new Date(now.getTime() - 24 * 60 * 60_000).toISOString()

    const keyCounts = getUsableKeyCountsByProvider()

    const monthModelMap = new Map<string, { inTok: number; outTok: number; totalTok: number }>()
    const dayProvMap = new Map<string, { inTok: number; outTok: number }>()

    try {
      const monthRows = this.db
        .prepare(
          `SELECT provider_id, model_id,
                  COALESCE(SUM(input_tokens), 0) AS in_tok,
                  COALESCE(SUM(output_tokens), 0) AS out_tok,
                  COALESCE(SUM(total_tokens), 0) AS total_tok
           FROM token_usage_logs
           WHERE created_at >= ?
           GROUP BY provider_id, model_id`
        )
        .all(monthStartIso) as Array<{
        provider_id: string
        model_id: string
        in_tok: number
        out_tok: number
        total_tok: number
      }>

      for (const r of monthRows) {
        monthModelMap.set(`${r.provider_id}::${r.model_id}`, {
          inTok: Number(r.in_tok) || 0,
          outTok: Number(r.out_tok) || 0,
          totalTok: Number(r.total_tok) || 0
        })
      }

      const dayRows = this.db
        .prepare(
          `SELECT provider_id,
                  COALESCE(SUM(input_tokens), 0) AS in_tok,
                  COALESCE(SUM(output_tokens), 0) AS out_tok
           FROM token_usage_logs
           WHERE created_at >= ?
           GROUP BY provider_id`
        )
        .all(dayStartIso) as Array<{ provider_id: string; in_tok: number; out_tok: number }>

      for (const r of dayRows) {
        dayProvMap.set(r.provider_id, {
          inTok: Number(r.in_tok) || 0,
          outTok: Number(r.out_tok) || 0
        })
      }
    } catch {
      // Safe defaults
    }

    const specsByProvider = new Map<ProviderId, typeof PROVIDER_MODEL_BUDGET_SPECS>()
    for (const spec of PROVIDER_MODEL_BUDGET_SPECS) {
      const list = specsByProvider.get(spec.providerId) ?? []
      list.push(spec)
      specsByProvider.set(spec.providerId, list)
    }

    const providerSet = new Set<ProviderId>(keyCounts.keys())
    for (const key of monthModelMap.keys()) {
      providerSet.add(key.split('::')[0] as ProviderId)
    }

    const providers: ProviderTokenBreakdownDTO[] = []
    const modelEntries: ModelBudgetEntryDTO[] = []
    let totalMonthlyBudgetTokens = 0
    let totalUsedMonthTokens = 0
    let unpublishedCount = 0

    for (const providerId of providerSet) {
      const usableKeyCount = keyCounts.get(providerId) ?? 0
      const specs = specsByProvider.get(providerId) ?? []
      const poolMaxBudget = new Map<string, { tokens: number; label: string }>()

      // Deduplicate shared provider quota pools (e.g. Gemini / Cerebras / Mistral share 1 pool per key)
      for (const spec of specs) {
        const parsed = monthlyBudgetScore({
          monthlyTokenBudget: spec.monthlyTokenBudget,
          tpdLimit: spec.tpdLimit
        })
        const effective = Number.isFinite(parsed) && parsed < Number.MAX_SAFE_INTEGER ? parsed : 0
        const prevPool = poolMaxBudget.get(spec.quotaPoolKey)
        if (!prevPool || effective > prevPool.tokens) {
          poolMaxBudget.set(spec.quotaPoolKey, {
            tokens: effective,
            label: spec.monthlyTokenBudget
          })
        }

        const key = `${providerId}::${spec.modelId}`
        const mUsage = monthModelMap.get(key)
        const scaledModelBudget = effective * Math.max(usableKeyCount, 0)
        const modelUsed = mUsage?.totalTok ?? 0

        modelEntries.push({
          providerId,
          modelId: spec.modelId,
          displayName: spec.displayName,
          budget: scaledModelBudget,
          used: modelUsed,
          remaining: Math.max(0, scaledModelBudget - modelUsed)
        })
      }

      // Include any discovered/custom models that logged tokens even if not in static specs
      for (const [key, mUsage] of monthModelMap.entries()) {
        const [p, mId] = key.split('::')
        if (p !== providerId) continue
        if (!specs.some((s) => s.modelId === mId)) {
          modelEntries.push({
            providerId,
            modelId: mId,
            displayName: mId,
            budget: 0,
            used: mUsage.totalTok,
            remaining: 0
          })
        }
      }

      let providerMonthlyBudget = 0
      let providerLabel = specs[0]?.monthlyTokenBudget || 'unpublished'
      for (const pool of poolMaxBudget.values()) {
        providerMonthlyBudget += pool.tokens * Math.max(usableKeyCount, 0)
        if (pool.tokens > 0 && pool.label) providerLabel = pool.label
      }

      let inputTokensMonth = 0
      let outputTokensMonth = 0
      let usedTokensMonth = 0
      for (const [key, mUsage] of monthModelMap.entries()) {
        if (key.startsWith(`${providerId}::`)) {
          inputTokensMonth += mUsage.inTok
          outputTokensMonth += mUsage.outTok
          usedTokensMonth += mUsage.totalTok
        }
      }

      const dayStats = dayProvMap.get(providerId)
      const budgetKind = classifyBudgetKind(providerLabel, providerMonthlyBudget)
      if (usableKeyCount > 0 && providerMonthlyBudget === 0) {
        unpublishedCount++
      }

      totalMonthlyBudgetTokens += providerMonthlyBudget
      totalUsedMonthTokens += usedTokensMonth

      providers.push({
        providerId,
        providerName: PROVIDER_DISPLAY_NAMES[providerId] || providerId.toUpperCase(),
        poolKey: specs[0]?.quotaPoolKey || `${providerId}::account`,
        usableKeyCount,
        monthlyTokenBudgetTokens: providerMonthlyBudget,
        monthlyBudgetLabel: providerLabel,
        budgetKind,
        usedTokensMonth,
        remainingTokensMonth: Math.max(0, providerMonthlyBudget - usedTokensMonth),
        inputTokens24h: dayStats?.inTok ?? 0,
        outputTokens24h: dayStats?.outTok ?? 0,
        inputTokensMonth,
        outputTokensMonth,
        modelsCount: specs.length
      })
    }

    providers.sort(
      (a, b) =>
        b.monthlyTokenBudgetTokens - a.monthlyTokenBudgetTokens ||
        b.usedTokensMonth - a.usedTokensMonth
    )
    modelEntries.sort((a, b) => b.budget - a.budget || b.used - a.used)

    const totalRemainingMonthTokens = Math.max(0, totalMonthlyBudgetTokens - totalUsedMonthTokens)
    const remainingPct =
      totalMonthlyBudgetTokens > 0
        ? Math.max(0, Math.min(100, (totalRemainingMonthTokens / totalMonthlyBudgetTokens) * 100))
        : 100

    return {
      generatedAt: now.toISOString(),
      totalMonthlyBudgetTokens,
      totalUsedMonthTokens,
      totalRemainingMonthTokens,
      remainingPct,
      activeProviderCount: keyCounts.size,
      providers,
      models: modelEntries,
      unpublishedCount
    }
  }
}
