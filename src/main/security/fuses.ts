/**
 * VersaRail AI Agent Harness - Electron Security Fuses
 * Flips compile-time fuses to harden the packaged Electron binary against
 * binary tampering, node inspection injection, and arbitrary script execution.
 */

import {
  flipFuses,
  getCurrentFuseWire,
  FuseVersion,
  FuseV1Options,
  FuseConfig
} from '@electron/fuses'
import fs from 'node:fs'

export enum FuseState {
  DISABLE = 48,
  ENABLE = 49,
  REMOVED = 114,
  INHERIT = 144
}

/**
 * Standard security fuse configuration adhering strictly to ADR-008
 */
export const SECURITY_FUSES_CONFIG: FuseConfig = {
  version: FuseVersion.V1,
  resetAdHocDarwinSignature: true,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true
}

export interface FuseVerificationResult {
  isHardened: boolean
  details: Record<string, any>
  violations: string[]
}

/**
 * Applies security fuses to a target Electron executable binary.
 */
export async function applySecurityFuses(
  executablePath: string,
  config: FuseConfig = SECURITY_FUSES_CONFIG
): Promise<number> {
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Target executable does not exist at path: ${executablePath}`)
  }

  return await flipFuses(executablePath, config)
}

/**
 * Inspects an Electron binary and verifies whether critical security fuses are enabled.
 */
export async function verifySecurityFuses(
  executablePath: string
): Promise<FuseVerificationResult> {
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Target executable does not exist at path: ${executablePath}`)
  }

  const currentWire = await getCurrentFuseWire(executablePath)
  const violations: string[] = []

  // Check critical fuses
  if (currentWire[FuseV1Options.RunAsNode] !== FuseState.DISABLE) {
    violations.push('RunAsNode is NOT disabled')
  }
  if (currentWire[FuseV1Options.EnableNodeCliInspectArguments] !== FuseState.DISABLE) {
    violations.push('EnableNodeCliInspectArguments is NOT disabled')
  }
  if (currentWire[FuseV1Options.EnableNodeOptionsEnvironmentVariable] !== FuseState.DISABLE) {
    violations.push('EnableNodeOptionsEnvironmentVariable is NOT disabled')
  }
  if (currentWire[FuseV1Options.OnlyLoadAppFromAsar] !== FuseState.ENABLE) {
    violations.push('OnlyLoadAppFromAsar is NOT enabled')
  }

  return {
    isHardened: violations.length === 0,
    details: currentWire as unknown as Record<string, any>,
    violations
  }
}

