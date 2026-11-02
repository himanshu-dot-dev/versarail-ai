/**
 * VersaRail AI Agent Harness - Command Security Policy
 * Validates and classifies commands before execution. Blocks dangerous system
 * commands, detects network exfiltration attempts, and escalates elevated commands.
 */
import * as path from 'path'

export type CommandVerdict = 'allowed' | 'blocked' | 'escalated'

export interface CommandPolicyResult {
  verdict: CommandVerdict
  reason?: string
  escalatedRiskLevel?: 'high' | 'critical'
}

export class CommandPolicy {
  /** Commands that are NEVER allowed (destructive, system-level, privilege escalation) */
  private static readonly BLOCKED_COMMANDS_WINDOWS = new Set([
    'format',
    'diskpart',
    'cipher',
    'bcdedit',
    'shutdown',
    'schtasks',
    'wmic',
    'runas',
    'netsh',
    'reg'
  ])

  private static readonly BLOCKED_COMMANDS_UNIX = new Set([
    'mkfs',
    'dd',
    'fdisk',
    'mount',
    'umount',
    'shutdown',
    'reboot',
    'init',
    'useradd',
    'userdel',
    'passwd',
    'iptables',
    'systemctl'
  ])

  /** Network commands → escalate to 'critical' risk */
  private static readonly NETWORK_COMMANDS = new Set([
    'curl',
    'wget',
    'ssh',
    'scp',
    'rsync',
    'ftp',
    'sftp',
    'nc',
    'netcat',
    'ncat',
    'nmap',
    'telnet',
    'socat'
  ])

  /** Elevated commands → escalate to 'critical' risk */
  private static readonly ELEVATED_COMMANDS = new Set([
    'sudo',
    'su',
    'doas',
    'powershell',
    'pwsh',
    'cmd'
  ])

  /** Dangerous PowerShell cmdlets/flags to check in args */
  private static readonly DANGEROUS_PS_ARGS = [
    'invoke-webrequest',
    'invoke-restmethod',
    'start-process',
    'set-executionpolicy',
    'new-scheduledtask',
    'register-scheduledtask',
    '-encodedcommand',
    '-enc'
  ]

  /** Shell metacharacters that suggest injection attempts */
  private static readonly SHELL_METACHARACTERS = ['|', '&', ';', '>', '<', '`', '$(']

  public static validate(command: string, args: string[] = []): CommandPolicyResult {
    if (!command || typeof command !== 'string') {
      return { verdict: 'blocked', reason: 'Command name must be a non-empty string' }
    }

    // Normalize command basename (lowercase without .exe/.cmd/.bat)
    const basename = path.basename(command).toLowerCase().replace(/\.exe$|\.cmd$|\.bat$/, '')
    const isWindows = process.platform === 'win32'

    // 1. Check platform-specific blocked commands
    const blockedSet = isWindows ? this.BLOCKED_COMMANDS_WINDOWS : this.BLOCKED_COMMANDS_UNIX
    if (blockedSet.has(basename)) {
      return { verdict: 'blocked', reason: `Command "${basename}" is strictly blocked by security policy` }
    }

    // 2. Special case: 'rm' with destructive flags targeting root
    if (basename === 'rm') {
      const joinedArgs = args.join(' ').toLowerCase()
      const hasRecursiveForce = joinedArgs.includes('-rf') || joinedArgs.includes('-r')
      const targetsRoot = args.some(
        (a) => a === '/' || a === '/*' || /^[a-z]:\\?$/i.test(a) || a === '\\'
      )
      if (hasRecursiveForce && targetsRoot) {
        return { verdict: 'blocked', reason: 'Recursive delete targeting root filesystem is strictly blocked' }
      }
    }

    // 3. Special case: 'del' / 'rmdir' with /s /q on Windows targeting root
    if (basename === 'del' || basename === 'rmdir') {
      const joinedArgs = args.join(' ').toLowerCase()
      if (joinedArgs.includes('/s')) {
        const targetsRoot = args.some((a) => /^[a-z]:\\?$/i.test(a) || a === '\\' || a === '/')
        if (targetsRoot) {
          return { verdict: 'blocked', reason: 'Recursive delete targeting root filesystem is strictly blocked' }
        }
      }
    }

    // 4. Special case: 'net' subcommands
    if (basename === 'net') {
      const sub = (args[0] || '').toLowerCase()
      if (['user', 'localgroup', 'share'].includes(sub)) {
        return { verdict: 'blocked', reason: `"net ${sub}" is blocked by security policy` }
      }
    }

    // 5. Network commands → escalate to critical
    if (this.NETWORK_COMMANDS.has(basename)) {
      return {
        verdict: 'escalated',
        reason: `Network command "${basename}" may transmit data externally`,
        escalatedRiskLevel: 'critical'
      }
    }

    // 6. Elevated commands → escalate to critical
    if (this.ELEVATED_COMMANDS.has(basename)) {
      if (basename === 'powershell' || basename === 'pwsh') {
        const lowerArgs = args.map((a) => a.toLowerCase())
        for (const dangerous of this.DANGEROUS_PS_ARGS) {
          if (lowerArgs.some((a) => a.includes(dangerous))) {
            return {
              verdict: 'escalated',
              reason: `PowerShell command with "${dangerous}" requires critical security authorization`,
              escalatedRiskLevel: 'critical'
            }
          }
        }
      }
      return {
        verdict: 'escalated',
        reason: `Elevated system interpreter "${basename}" requires explicit authorization`,
        escalatedRiskLevel: 'critical'
      }
    }

    // 7. Check for shell metacharacters in arguments (injection indicators)
    for (const arg of args) {
      for (const meta of this.SHELL_METACHARACTERS) {
        if (arg.includes(meta)) {
          return {
            verdict: 'escalated',
            reason: `Argument contains shell metacharacter "${meta}" — potential command chaining/injection`,
            escalatedRiskLevel: 'critical'
          }
        }
      }
    }

    // 8. Package publishing and remote push checks
    if (['npm', 'yarn', 'pnpm'].includes(basename)) {
      if (args.includes('publish')) {
        return {
          verdict: 'escalated',
          reason: `"${basename} publish" publishes packages to an external registry`,
          escalatedRiskLevel: 'critical'
        }
      }
    }

    if (basename === 'git') {
      if (args.includes('push') || args.includes('remote')) {
        return {
          verdict: 'escalated',
          reason: `git ${args[0] || 'remote operation'} connects to external servers`,
          escalatedRiskLevel: 'critical'
        }
      }
    }

    if (basename === 'docker' && args.includes('push')) {
      return {
        verdict: 'escalated',
        reason: 'docker push sends image layers to external registry',
        escalatedRiskLevel: 'critical'
      }
    }

    return { verdict: 'allowed' }
  }
}

