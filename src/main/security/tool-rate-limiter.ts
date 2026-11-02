/**
 * VersaRail AI Agent Harness - Tool Call Rate Limiter
 * Sliding-window rate limiting per tool capability category.
 * Prevents rapid-fire destructive operations or runaway loops.
 */

export interface RateLimitConfig {
  maxCallsPerMinute: number // Total tool calls per minute (default: 30)
  maxWriteOpsPerMinute: number // fs:write calls per minute (default: 10)
  maxExecOpsPerMinute: number // cmd:exec calls per minute (default: 5)
}

export class RateLimitExceededError extends Error {
  constructor(capability: string, limit: number) {
    super(`Rate limit exceeded for tool capability "${capability}": maximum ${limit} calls allowed per minute`)
    this.name = 'RateLimitExceededError'
    Object.setPrototypeOf(this, RateLimitExceededError.prototype)
  }
}

export class ToolRateLimiter {
  private static instance: ToolRateLimiter | null = null
  private callTimestamps: Map<string, number[]> = new Map()
  private config: RateLimitConfig

  private constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxCallsPerMinute: config?.maxCallsPerMinute ?? 30,
      maxWriteOpsPerMinute: config?.maxWriteOpsPerMinute ?? 10,
      maxExecOpsPerMinute: config?.maxExecOpsPerMinute ?? 5
    }
  }

  public static getInstance(config?: Partial<RateLimitConfig>): ToolRateLimiter {
    if (!ToolRateLimiter.instance) {
      ToolRateLimiter.instance = new ToolRateLimiter(config)
    }
    return ToolRateLimiter.instance
  }

  public static resetInstance(): void {
    ToolRateLimiter.instance = null
  }

  /**
   * Records a tool invocation and checks if any sliding-window limit is breached.
   * @throws RateLimitExceededError if the rate limit is exceeded
   */
  public checkAndRecord(capability: string): void {
    const now = Date.now()
    const windowMs = 60_000

    // 1. Clean up old timestamps across all records
    const globalTimestamps: number[] = []
    for (const [cap, list] of this.callTimestamps.entries()) {
      const active = list.filter((t) => now - t <= windowMs)
      this.callTimestamps.set(cap, active)
      globalTimestamps.push(...active)
    }

    // 2. Check total global calls across all capabilities
    if (globalTimestamps.length >= this.config.maxCallsPerMinute) {
      throw new RateLimitExceededError('all', this.config.maxCallsPerMinute)
    }

    // 3. Check specific capability limit
    const capList = this.callTimestamps.get(capability) || []
    let capLimit = this.config.maxCallsPerMinute
    if (capability === 'fs:write') {
      capLimit = this.config.maxWriteOpsPerMinute
    } else if (capability === 'cmd:exec') {
      capLimit = this.config.maxExecOpsPerMinute
    }

    if (capList.length >= capLimit) {
      throw new RateLimitExceededError(capability, capLimit)
    }

    // 4. Record new timestamp
    capList.push(now)
    this.callTimestamps.set(capability, capList)
  }

  public reset(): void {
    this.callTimestamps.clear()
  }
}

