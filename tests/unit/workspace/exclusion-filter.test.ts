import { describe, it, expect, beforeEach } from 'vitest'
import { ExclusionFilter } from '../../../src/main/workspace/exclusion-filter'

describe('ExclusionFilter - Sensitive Files & Directories Defense', () => {
  beforeEach(() => {
    ExclusionFilter.resetCustomExclusions()
  })

  it('rejects environment files (.env, .env.local, .env.production)', () => {
    expect(ExclusionFilter.isExcluded('.env').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('.env.local').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('.env.production').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('config/.env').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('nested/dir/.env.test').excluded).toBe(true)
  })

  it('rejects git internal directories and metadata', () => {
    expect(ExclusionFilter.isExcluded('.git').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('.git/HEAD').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('.git/config').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('packages/core/.git/objects').excluded).toBe(true)
  })

  it('rejects node_modules at any depth', () => {
    expect(ExclusionFilter.isExcluded('node_modules').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('node_modules/react/package.json').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('subproject/node_modules/axios').excluded).toBe(true)
  })

  it('rejects SSH keys and directories', () => {
    expect(ExclusionFilter.isExcluded('.ssh').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('.ssh/id_rsa').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('id_rsa').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('id_ed25519').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('keys/id_ecdsa').excluded).toBe(true)
  })

  it('rejects private keys and certificates by file extension', () => {
    expect(ExclusionFilter.isExcluded('server.key').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('ssl/cert.pem').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('auth.pkcs12').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('keystore.pfx').excluded).toBe(true)
  })

  it('rejects cloud credential configurations', () => {
    expect(ExclusionFilter.isExcluded('.aws').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('.aws/credentials').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('.azure').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('.gcp').excluded).toBe(true)
  })

  it('allows safe, legitimate development project files', () => {
    expect(ExclusionFilter.isExcluded('src/main/index.ts').excluded).toBe(false)
    expect(ExclusionFilter.isExcluded('package.json').excluded).toBe(false)
    expect(ExclusionFilter.isExcluded('README.md').excluded).toBe(false)
    expect(ExclusionFilter.isExcluded('src/components/Keybindings.tsx').excluded).toBe(false)
    expect(ExclusionFilter.isExcluded('docs/environment-setup.md').excluded).toBe(false)
  })

  it('supports custom workspace exclusion patterns', () => {
    ExclusionFilter.addCustomExclusion(/secret-internal/, 'Proprietary internal secret')
    expect(ExclusionFilter.isExcluded('src/secret-internal-module.ts').excluded).toBe(true)
    expect(ExclusionFilter.isExcluded('src/public-module.ts').excluded).toBe(false)
  })
})

