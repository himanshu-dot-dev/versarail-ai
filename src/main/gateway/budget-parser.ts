/**
 * Free-tier Monthly Token Budget & Label Parser
 * Reference: FreeLLMAPI server/src/lib/budget.ts
 *
 * Parses human-readable budget strings such as '~120M', '~50-100M', '~1-2M',
 * 'free · 500K tokens/day', or 'free · 1M tokens/24h' into an absolute monthly
 * token budget. Rate-limit-only labels ('free · 40 RPM', 'free · 14.4K rpd',
 * 'free · 200/hr per IP', 'credits-based') return 0 so callers treat them as
 * unpublished token caps rather than bogus token budgets.
 */

export function parseBudget(label: string): number {
  if (!label) return 0
  const normalized = String(label).toLowerCase()
  const head = normalized.replace(/\([^)]*\)/g, '').trim()

  const match = head.match(/~?([\d.]+)(?:-([\d.]+))?([mk])(?![a-z])/)
  if (!match) return 0

  const high = parseFloat(match[2] ?? match[1])
  if (Number.isNaN(high)) return 0

  const tail = head.slice((match.index ?? 0) + match[0].length)
  if (/^\s*(?:rpd|rpm|rph|rps|req|requests?|calls?|messages?|prompts?|neurons?)\b/.test(tail)) {
    return 0
  }

  const tokens = high * (match[3] === 'm' ? 1_000_000 : 1_000)
  const period = tail.split(/[,·;]/)[0]
  const perDay = /\b(?:per\s*)?days?\b|\bdaily\b|\b24\s*h(?:rs?|ours?)?\b/.test(period)
  return perDay ? tokens * 30 : tokens
}

export function monthlyBudgetScore(entry: {
  monthlyTokenBudget: string
  tpdLimit: number | null
}): number {
  if (entry.tpdLimit != null && entry.tpdLimit > 0) {
    return entry.tpdLimit * 30
  }
  const str = entry.monthlyTokenBudget || ''
  if (!str) return 0
  const lower = str.toLowerCase()
  if (lower.includes('unlimited') || str.includes('∞')) {
    return Number.MAX_SAFE_INTEGER
  }
  return parseBudget(str)
}

export function classifyBudgetKind(
  monthlyTokenBudget: string,
  parsedTokens: number
): 'documented' | 'credits' | 'unpublished' {
  if (parsedTokens > 0) return 'documented'
  if (/credit/i.test(monthlyTokenBudget || '')) return 'credits'
  return 'unpublished'
}

export function formatCompactTokens(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return '0'
  if (tokens >= 1_000_000_000) {
    const val = tokens / 1_000_000_000
    return `${val >= 10 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '')}B`
  }
  if (tokens >= 1_000_000) {
    const val = tokens / 1_000_000
    return `${val >= 10 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (tokens >= 1_000) {
    const val = tokens / 1_000
    return `${val >= 10 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '')}K`
  }
  return String(Math.round(tokens))
}
