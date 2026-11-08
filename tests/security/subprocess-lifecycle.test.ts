/**
 * VersaRail AI Agent Harness - Subprocess Lifecycle & Command Security Tests
 * Agent Command Runner Lifecycle & Security
 *
 * Verifies that:
 * 1. Structured argument arrays prevent shell command injection.
 * 2. Timeouts trigger recursive process-tree termination via tree-kill without orphaned processes.
 * 3. Mid-flight AbortSignal cancellation terminates process trees cleanly.
 * 4. Output buffer caps prevent memory exhaustion from runaway loops.
 * 5. Secret redaction automatically masks credentials appearing in command stdout/stderr.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AgentCommandRunner } from '../../src/main/agent/command-runner'

describe('Subprocess Lifecycle & Agent Command Execution Security', () => {
  let runner: AgentCommandRunner

  beforeEach(() => {
    AgentCommandRunner.resetInstance()
    runner = AgentCommandRunner.getInstance()
  })

  afterEach(() => {
    AgentCommandRunner.resetInstance()
  })

  it('executes commands with structured arguments preventing shell injection', async () => {
    // Attempt shell injection using semicolon and pipe in argument array
    const maliciousArg = 'hello; echo INJECTED_EXECUTION'
    const script = `console.log(process.argv[1]);`

    const result = await runner.runCommand({
      command: 'node',
      args: ['-e', script, maliciousArg]
    })

    expect(result.exitCode).toBe(0)
    // The argument is received literally as a string, never executed by a shell
    expect(result.stdout.trim()).toBe('hello; echo INJECTED_EXECUTION')
    expect(result.stdout).not.toBe('hello\nINJECTED_EXECUTION\n')
  })

  it('enforces execution timeouts and kills process tree via tree-kill', async () => {
    // Spawn a long-running process that would run for 60 seconds
    const script = `setInterval(() => { console.log('heartbeat'); }, 1000);`

    const startTime = Date.now()
    await expect(
      runner.runCommand({
        command: 'node',
        args: ['-e', script],
        timeoutMs: 400
      })
    ).rejects.toThrow(/timed out after 400ms/)

    const duration = Date.now() - startTime
    // Should have aborted close to the 400ms mark, well before 60 seconds
    expect(duration).toBeLessThan(3000)
  })

  it('terminates process tree cleanly when aborted via AbortSignal', async () => {
    const controller = new AbortController()
    const script = `setInterval(() => {}, 500);`

    // Abort after 200ms
    setTimeout(() => {
      controller.abort()
    }, 200)

    const startTime = Date.now()
    await expect(
      runner.runCommand({
        command: 'node',
        args: ['-e', script],
        timeoutMs: 10_000,
        signal: controller.signal
      })
    ).rejects.toThrow()

    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(3000)
  })

  it('caps command output buffer at 1MB and marks isTruncated true', async () => {
    // Script outputs 1.5MB of data
    const script = `
      const chunk = 'A'.repeat(1024 * 64); // 64KB
      for (let i = 0; i < 25; i++) {
        process.stdout.write(chunk);
      }
    `

    const result = await runner.runCommand({
      command: 'node',
      args: ['-e', script],
      timeoutMs: 5000,
      maxOutputBytes: 1024 * 128 // 128KB limit for fast test
    })

    expect(result.isTruncated).toBe(true)
    expect(result.stdout).toContain('[TRUNCATED: Output exceeded 1MB limit]')
    expect(result.stdout.length).toBeLessThan(1024 * 200)
  })

  it('redacts sensitive API keys and secrets from command stdout', async () => {
    const mockApiKey = 'sk-proj-abcde1234567890123456789012345678901234567890123'
    const script = `console.log("Server key is ${mockApiKey}");`

    const result = await runner.runCommand({
      command: 'node',
      args: ['-e', script]
    })

    expect(result.stdout).not.toContain(mockApiKey)
    expect(result.stdout).toContain('[REDACTED_SECRET]')
  })
})
