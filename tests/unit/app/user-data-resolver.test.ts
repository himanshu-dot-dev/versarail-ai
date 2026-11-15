import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { resolveUserDataConfig } from '../../../src/main/app/user-data-resolver'

describe('resolveUserDataConfig - Environment Isolation', () => {
  const mockAppData = 'C:\\Users\\test\\AppData\\Roaming'

  it('resolves development user data path when unpackaged', () => {
    const config = resolveUserDataConfig({
      argv: ['node', 'electron'],
      env: {},
      isPackaged: false,
      appDataPath: mockAppData
    })

    expect(config.appName).toBe('versarail-ai-dev')
    expect(config.userDataPath).toBe(path.join(mockAppData, 'versarail-ai-dev'))
  })

  it('resolves production user data path when packaged', () => {
    const config = resolveUserDataConfig({
      argv: ['versarail-ai.exe'],
      env: {},
      isPackaged: true,
      appDataPath: mockAppData
    })

    expect(config.appName).toBe('versarail-ai')
    expect(config.userDataPath).toBe(path.join(mockAppData, 'versarail-ai'))
  })

  it('prioritizes HARNESS_USER_DATA_DIR environment variable for isolated testing', () => {
    const customTestDir = 'C:\\Temp\\custom-test-dir'
    const config = resolveUserDataConfig({
      argv: ['node', 'electron'],
      env: { HARNESS_USER_DATA_DIR: customTestDir },
      isPackaged: false,
      appDataPath: mockAppData
    })

    expect(config.userDataPath).toBe(customTestDir)
  })

  it('prioritizes --user-data-dir CLI argument above all else', () => {
    const cliDir = 'C:\\Temp\\cli-user-data'
    const envDir = 'C:\\Temp\\env-user-data'
    const config = resolveUserDataConfig({
      argv: ['node', 'electron', `--user-data-dir=${cliDir}`],
      env: { HARNESS_USER_DATA_DIR: envDir },
      isPackaged: false,
      appDataPath: mockAppData
    })

    expect(config.userDataPath).toBe(cliDir)
  })
})
