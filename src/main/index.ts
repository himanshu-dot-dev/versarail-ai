import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerCustomProtocol, setupProtocolHandler } from './app/protocol-handler'
import { createMainWindow } from './app/window-manager'
import { registerIpcHandlers } from './ipc/ipc-router'
import { SqliteDatabase } from './storage/sqlite-database'
import { AgentCommandRunner } from './agent/command-runner'

// Configure isolated user data directory if specified (e.g. for Playwright or e2e tests)
const customUserDataArg = process.argv.find((a) => a.startsWith('--user-data-dir='))
if (customUserDataArg) {
  const customPath = customUserDataArg.split('=')[1]
  if (customPath) {
    app.setPath('userData', customPath)
  }
} else if (process.env.HARNESS_USER_DATA_DIR) {
  app.setPath('userData', process.env.HARNESS_USER_DATA_DIR)
}

// 1. Register custom 'app://' protocol before app is ready
registerCustomProtocol()

// Set Application User Model ID for Windows taskbar grouping & icon association
if (process.platform === 'win32') {
  app.setAppUserModelId('com.versarail.ai.harness')
}

// 2. Enforce Single-Instance Lock (bypass in automated test mode to prevent test-runner collision)
const isTestMode = process.env.HARNESS_TEST_MODE === '1' || process.argv.includes('--test-mode')
const gotTheLock = isTestMode || app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.warn('[App] Another instance is already running. Terminating.')
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.on('second-instance', () => {
    // Focus existing window if a second instance attempts to launch
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // 1. Initialize local SQLite persistence & migrations
    SqliteDatabase.getInstance()

    // 2. Register protocol handler for production assets
    const rendererDistPath = join(__dirname, '../renderer')
    setupProtocolHandler(rendererDistPath)

    // 3. Register all trusted IPC handlers
    registerIpcHandlers()

    // Create main desktop window
    mainWindow = createMainWindow()

    app.on('activate', () => {
      // macOS dock click behavior
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
      }
    })
  })

  // Clean shutdown
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // Gracefully terminate any spawned child processes and close SQLite cleanly
  app.on('will-quit', () => {
    try {
      AgentCommandRunner.getInstance().terminateAll()
    } catch {
      // ignore
    }
    try {
      SqliteDatabase.getInstance().close()
    } catch {
      // ignore
    }
  })
}
