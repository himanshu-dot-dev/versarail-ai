/**
 * VersaRail AI Agent Harness - Command Timeout Budgets
 * Ported from Kilo Code (packages/kilo-vscode/src/agent-manager/command-budget.ts)
 *
 * Differentiates command deadlines:
 * - probe (version, status checks): 5 seconds
 * - read (file/diff reads): 15 seconds
 * - exec / build (npm, tsc, cargo): 45 seconds
 * - network / publish: 25 seconds
 */

export const COMMAND_BUDGET = {
  /** Metadata and status checks (e.g., git --version, git status, git branch) */
  probe: 5_000,
  /** Content reads that scale with diff or repository size (git diff, git log, file search) */
  read: 15_000,
  /** Long-running execution or build operations (npm test, tsc, build) */
  build: 45_000,
  /** Network operations that communicate with remote APIs or Git remotes */
  network: 25_000,
  /** Default fallback budget */
  default: 30_000
} as const

export class CommandBudget {
  /**
   * Resolves the recommended timeout budget in milliseconds based on the command and arguments.
   */
  public static resolveTimeout(command: string, args: string[] = []): number {
    const cmd = command.toLowerCase()
    const firstArg = (args[0] || '').toLowerCase()

    // 1. Probe commands
    if (cmd === 'git') {
      if (['status', 'rev-parse', 'branch', '--version'].includes(firstArg)) {
        return COMMAND_BUDGET.probe
      }
      if (['diff', 'log', 'show', 'cat-file', 'ls-files'].includes(firstArg)) {
        return COMMAND_BUDGET.read
      }
      if (['fetch', 'pull', 'push', 'remote'].includes(firstArg)) {
        return COMMAND_BUDGET.network
      }
    }

    if (['node', 'npm', 'yarn', 'pnpm', 'bun'].includes(cmd)) {
      if (['--version', '-v'].includes(firstArg)) {
        return COMMAND_BUDGET.probe
      }
      if (['test', 'build', 'run', 'compile'].includes(firstArg)) {
        return COMMAND_BUDGET.build
      }
      if (['install', 'add', 'publish'].includes(firstArg)) {
        return COMMAND_BUDGET.network
      }
    }

    if (['curl', 'wget', 'ssh', 'scp'].includes(cmd)) {
      return COMMAND_BUDGET.network
    }

    return COMMAND_BUDGET.default
  }
}

