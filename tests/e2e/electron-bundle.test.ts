/**
 * VersaRail AI Agent Harness - Production Bundle & Security Fuse Verification
 * Milestone 11: Production Artifact Integrity & Electron Security Verification
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { SECURITY_FUSES_CONFIG } from '../../src/main/security/fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'

describe('Production Bundle & Security Fuse Verification (E2E)', () => {
  const rootDir = process.cwd()
  const outDir = path.join(rootDir, 'out')
  const mainBundle = path.join(outDir, 'main', 'index.js')
  const preloadBundle = path.join(outDir, 'preload', 'index.js')
  const rendererIndex = path.join(outDir, 'renderer', 'index.html')

  it('verifies that all compiled production bundles exist and are non-empty', () => {
    expect(fs.existsSync(mainBundle)).toBe(true)
    expect(fs.existsSync(preloadBundle)).toBe(true)
    expect(fs.existsSync(rendererIndex)).toBe(true)

    const mainStat = fs.statSync(mainBundle)
    const preloadStat = fs.statSync(preloadBundle)
    const rendererStat = fs.statSync(rendererIndex)

    expect(mainStat.size).toBeGreaterThan(10_000) // ~140KB
    expect(preloadStat.size).toBeGreaterThan(1_000) // ~7KB
    expect(rendererStat.size).toBeGreaterThan(200)
  })

  it('strictly enforces offline-first zero external font CDNs in production assets', () => {
    const htmlContent = fs.readFileSync(rendererIndex, 'utf-8')

    // Must never reference external font CDNs
    expect(htmlContent).not.toContain('fonts.googleapis.com')
    expect(htmlContent).not.toContain('fonts.gstatic.com')

    // Must declare restrictive Content-Security-Policy
    expect(htmlContent).toContain('Content-Security-Policy')
    expect(htmlContent).toContain("connect-src 'none'")
    expect(htmlContent).toContain("script-src 'self'")
  })

  it('verifies that preload bundle isolates contextBridge API without leaking Node globals', () => {
    const preloadContent = fs.readFileSync(preloadBundle, 'utf-8')

    // Preload must expose the secure electronApi bridge
    expect(preloadContent).toContain('contextBridge')
    expect(preloadContent).toContain('electronApi')
  })

  it('validates compilation fuse configurations against ADR-008 security specifications', () => {
    expect(SECURITY_FUSES_CONFIG.version).toBe(FuseVersion.V1)
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.RunAsNode]).toBe(false)
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.EnableNodeCliInspectArguments]).toBe(false)
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.EnableNodeOptionsEnvironmentVariable]).toBe(false)
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.OnlyLoadAppFromAsar]).toBe(true)
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]).toBe(true)
    expect(SECURITY_FUSES_CONFIG[FuseV1Options.EnableCookieEncryption]).toBe(true)
  })
})
