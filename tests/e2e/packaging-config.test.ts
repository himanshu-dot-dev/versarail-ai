/**
 * VersaRail AI Agent Harness - Packaging Configuration Verification
 * Milestone 12: Production Packaging, Cross-Platform Bundler & Assets
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Production Packaging Configuration Verification (Milestone 12)', () => {
  const rootDir = process.cwd()
  const builderConfigPath = path.join(rootDir, 'electron-builder.yml')
  const afterPackScriptPath = path.join(rootDir, 'scripts', 'after-pack.js')
  const macEntitlementsPath = path.join(rootDir, 'resources', 'entitlements.mac.plist')
  const packageJsonPath = path.join(rootDir, 'package.json')

  it('verifies that electron-builder.yml is present and configures multi-platform distribution', () => {
    expect(fs.existsSync(builderConfigPath)).toBe(true)
    const content = fs.readFileSync(builderConfigPath, 'utf-8')

    // App Identity
    expect(content).toContain('appId: com.versarail.ai.harness')
    expect(content).toContain('productName: VersaRail AI')

    // ASAR & afterPack fuse hook
    expect(content).toContain('asar: true')
    expect(content).toContain('afterPack: scripts/after-pack.js')

    // Target Operating Systems
    expect(content).toContain('win:')
    expect(content).toContain('nsis')
    expect(content).toContain('portable')

    expect(content).toContain('mac:')
    expect(content).toContain('dmg')
    expect(content).toContain('hardenedRuntime: true')

    expect(content).toContain('linux:')
    expect(content).toContain('AppImage')
    expect(content).toContain('deb')
  })

  it('verifies that afterPack hook exports security fuse flipping logic', () => {
    expect(fs.existsSync(afterPackScriptPath)).toBe(true)
    const scriptContent = fs.readFileSync(afterPackScriptPath, 'utf-8')

    expect(scriptContent).toContain('@electron/fuses')
    expect(scriptContent).toContain('flipFuses')
    expect(scriptContent).toContain('FuseV1Options.RunAsNode')
    expect(scriptContent).toContain('FuseV1Options.OnlyLoadAppFromAsar')
  })

  it('verifies that macOS security entitlements exist for hardened runtime', () => {
    expect(fs.existsSync(macEntitlementsPath)).toBe(true)
    const plistContent = fs.readFileSync(macEntitlementsPath, 'utf-8')

    expect(plistContent).toContain('com.apple.security.cs.allow-jit')
    expect(plistContent).toContain('com.apple.security.cs.debugger')
  })

  it('verifies that package.json defines multi-platform packaging commands', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

    expect(pkg.scripts.package).toBeDefined()
    expect(pkg.scripts['package:dir']).toBeDefined()
    expect(pkg.scripts['package:win']).toBeDefined()
    expect(pkg.scripts['package:mac']).toBeDefined()
    expect(pkg.scripts['package:linux']).toBeDefined()
  })
})
