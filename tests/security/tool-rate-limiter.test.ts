import { describe, it, expect, beforeEach } from 'vitest'
import { ToolRateLimiter, RateLimitExceededError } from '../../src/main/security/tool-rate-limiter'

describe('ToolRateLimiter Security Suite', () => {
  beforeEach(() => {
    ToolRateLimiter.resetInstance()
  })

  it('allows tool invocations within normal configured limits', () => {
    const limiter = ToolRateLimiter.getInstance({
      maxCallsPerMinute: 10,
      maxWriteOpsPerMinute: 5,
      maxExecOpsPerMinute: 3
    })

    expect(() => {
      limiter.checkAndRecord('fs:read')
      limiter.checkAndRecord('fs:read')
      limiter.checkAndRecord('fs:write')
    }).not.toThrow()
  })

  it('throws RateLimitExceededError when capability threshold is breached', () => {
    const limiter = ToolRateLimiter.getInstance({
      maxCallsPerMinute: 20,
      maxWriteOpsPerMinute: 2,
      maxExecOpsPerMinute: 1
    })

    limiter.checkAndRecord('fs:write')
    limiter.checkAndRecord('fs:write')

    expect(() => {
      limiter.checkAndRecord('fs:write')
    }).toThrow(RateLimitExceededError)
  })

  it('enforces command execution rate limit strictly', () => {
    const limiter = ToolRateLimiter.getInstance({
      maxCallsPerMinute: 10,
      maxWriteOpsPerMinute: 5,
      maxExecOpsPerMinute: 1
    })

    limiter.checkAndRecord('cmd:exec')

    expect(() => {
      limiter.checkAndRecord('cmd:exec')
    }).toThrow(RateLimitExceededError)
  })

  it('resets counters cleanly', () => {
    const limiter = ToolRateLimiter.getInstance({
      maxCallsPerMinute: 5,
      maxWriteOpsPerMinute: 1,
      maxExecOpsPerMinute: 1
    })

    limiter.checkAndRecord('cmd:exec')
    limiter.reset()

    expect(() => {
      limiter.checkAndRecord('cmd:exec')
    }).not.toThrow()
  })
})

