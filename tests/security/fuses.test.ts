/**
 * VersaRail AI Agent Harness - Security Test Suite
 * Milestone 11: Electron Security Fuses Verification
 */

import { describe, it, expect, vi } from 'vitest'
import {
  SECURITY_FUSES_CONFIG,
  applySecurityFuses,
  verifySecurityFuses,
  FuseState
} from '../../src/main/security/fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import * as electronFuses from '@electron/fuses'
import fs from 'node:fs'

describe('Scenario 4: Electron Compile-Time Security Fuses', () => {
  it('defines mandatory security fuses adhering strictly to ADR-008', () => {
    expect(SECURITY_FUSES_CONFIG.version).toBe(FuseVersion.V1)
    // RunAsNode must be false (disables ELECTRON_RUN_AS_NODE environment exploit)
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.RunAsNode]).toBe(false)
    // Inspect arguments disabled to prevent debugging / devtools attachment injection
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.EnableNodeCliInspectArguments]).toBe(false)
    // NODE_OPTIONS env variable disabled
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.EnableNodeOptionsEnvironmentVariable]).toBe(false)
    // OnlyLoadAppFromAsar must be true (blocks running loose malicious script folders)
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.OnlyLoadAppFromAsar]).toBe(true)
    // Embedded Asar integrity validation enabled
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]).toBe(true)
    // OS Cookie / credential encryption enabled
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.EnableCookieEncryption]).toBe(true)
  })

  it('rejects execution when target executable does not exist', async () => {
    await expect(
      applySecurityFuses('/non/existent/path/electron.exe')
    ).rejects.toThrow('Target executable does not exist')

    await expect(
      verifySecurityFuses('/non/existent/path/electron.exe')
    ).rejects.toThrow('Target executable does not exist')
  })

  it('detects unhardened binaries and reports exact fuse violations', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(electronFuses, 'getCurrentFuseWire').mockResolvedValue({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: FuseState.ENABLE, // VIOLATION: not disabled
      [FuseV1Options.EnableNodeCliInspectArguments]: FuseState.ENABLE, // VIOLATION
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: FuseState.ENABLE, // VIOLATION
      [FuseV1Options.OnlyLoadAppFromAsar]: FuseState.DISABLE // VIOLATION
    } as any)

    const result = await verifySecurityFuses('/mock/electron.exe')

    expect(result.isHardened).toBe(false)
    expect(result.violations.length).toBe(4)
    expect(result.violations).toContain('RunAsNode is NOT disabled')
    expect(result.violations).toContain('EnableNodeCliInspectArguments is NOT disabled')
    expect(result.violations).toContain('EnableNodeOptionsEnvironmentVariable is NOT disabled')
    expect(result.violations).toContain('OnlyLoadAppFromAsar is NOT enabled')

    vi.restoreAllMocks()
  })

  it('confirms hardened state when all critical fuses are properly flipped', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(electronFuses, 'getCurrentFuseWire').mockResolvedValue({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: FuseState.DISABLE,
      [FuseV1Options.EnableNodeCliInspectArguments]: FuseState.DISABLE,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: FuseState.DISABLE,
      [FuseV1Options.OnlyLoadAppFromAsar]: FuseState.ENABLE,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: FuseState.ENABLE
    } as any)

    const result = await verifySecurityFuses('/mock/electron.exe')

    expect(result.isHardened).toBe(true)
    expect(result.violations.length).toBe(0)

    vi.restoreAllMocks()
  })
})

