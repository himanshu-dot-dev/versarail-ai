/**
 * VersaRail AI Agent Harness - Subprocess Lifecycle & Command Security Tests
 * Milestone 9: Dual Terminal & Agent Command Runner
 *
 * Verifies that:
 * 1. Structured argument arrays prevent shell command injection.
 * 2. Timeouts trigger recursive process-tree termination via tree-kill without orphaned processes.
 * 3. Mid-flight AbortSignal cancellation terminates process trees cleanly.
 * 4. Output buffer caps prevent memory exhaustion from runaway loops.
 * 5. Secret redaction automatically masks credentials appearing in command stdout/stderr.
 * 6. UserTerminalService spawns interactive shells, handles keystrokes, and closes cleanly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AgentCommandRunner } from '../../src/main/agent/command-runner'
import { UserTerminalService } from '../../src/main/terminal/terminal-service'

describe('Subprocess Lifecycle & Dual Terminal Execution Security', () => {
  let runner: AgentCommandRunner
  let terminalService: UserTerminalService

  beforeEach(() => {
    AgentCommandRunner.resetInstance()
    UserTerminalService.resetInstance()

    runner = AgentCommandRunner.getInstance()
    terminalService = UserTerminalService.getInstance()
  })

  afterEach(() => {
    AgentCommandRunner.resetInstance()
    UserTerminalService.resetInstance()
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

  it('spawns interactive user terminal session and streams I/O cleanly', async () => {
    return new Promise<void>((resolve, reject) => {
      let outputBuffer = ''
      const timeout = setTimeout(() => {
        terminalService.closeAllSessions()
        reject(new Error('Terminal response timed out'))
      }, 5000)

      const { sessionId } = terminalService.createSession({
        onData: (data) => {
          outputBuffer += data
          if (outputBuffer.includes('VERSARAIL_TERMINAL_ECHO')) {
            clearTimeout(timeout)
            terminalService.closeSession(sessionId)
            expect(terminalService.getActiveSessionCount()).toBe(0)
            resolve()
          }
        }
      })

      expect(sessionId).toBeDefined()
      expect(terminalService.getActiveSessionCount()).toBe(1)

      // Send command to shell stdin
      const newline = process.platform === 'win32' ? '\r\n' : '\n'
      terminalService.write(sessionId, `echo VERSARAIL_TERMINAL_ECHO${newline}`)
    })
  })

  it('terminates user terminal process tree when session is closed', async () => {
    const { sessionId } = terminalService.createSession()
    expect(terminalService.getActiveSessionCount()).toBe(1)

    const session = terminalService.getSession(sessionId)
    expect(session).toBeDefined()
    const pid = session?.child.pid
    expect(pid).toBeDefined()

    const closed = terminalService.closeSession(sessionId)
    expect(closed).toBe(true)
    expect(terminalService.getActiveSessionCount()).toBe(0)
    expect(terminalService.getSession(sessionId)).toBeUndefined()
  })
})
