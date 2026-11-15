import { join } from 'path'

export interface UserDataResolverOptions {
  argv: string[]
  env: NodeJS.ProcessEnv
  isPackaged: boolean
  appDataPath: string
}

export interface UserDataConfig {
  appName: string
  userDataPath: string
}

/**
 * Resolves the application name and user data directory based on execution environment.
 * Priority:
 * 1. CLI flag: --user-data-dir=<path>
 * 2. Environment variable: HARNESS_USER_DATA_DIR=<path>
 * 3. Development mode (!isPackaged): 'versarail-ai-dev' under appData
 * 4. Production mode (isPackaged): 'versarail-ai' under appData
 */
export function resolveUserDataConfig(options: UserDataResolverOptions): UserDataConfig {
  const { argv, env, isPackaged, appDataPath } = options

  // 1. Explicit CLI argument takes top priority (e.g. for e2e test harnesses)
  const customUserDataArg = argv.find((a) => a.startsWith('--user-data-dir='))
  if (customUserDataArg) {
    const customPath = customUserDataArg.split('=')[1]
    if (customPath) {
      return {
        appName: isPackaged ? 'versarail-ai' : 'versarail-ai-dev',
        userDataPath: customPath
      }
    }
  }

  // 2. Explicit environment variable for testing/isolation (HARNESS_USER_DATA_DIR)
  if (env.HARNESS_USER_DATA_DIR) {
    return {
      appName: isPackaged ? 'versarail-ai' : 'versarail-ai-dev',
      userDataPath: env.HARNESS_USER_DATA_DIR
    }
  }

  // 3. In development (!isPackaged), isolate to 'versarail-ai-dev'
  if (!isPackaged) {
    return {
      appName: 'versarail-ai-dev',
      userDataPath: join(appDataPath, 'versarail-ai-dev')
    }
  }

  // 4. In packaged production, use standard 'versarail-ai'
  return {
    appName: 'versarail-ai',
    userDataPath: join(appDataPath, 'versarail-ai')
  }
}
