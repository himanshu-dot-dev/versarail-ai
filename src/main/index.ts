import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerCustomProtocol, setupProtocolHandler } from './app/protocol-handler'
import { createMainWindow } from './app/window-manager'
import { registerIpcHandlers } from './ipc/ipc-router'
import { SqliteDatabase } from './storage/sqlite-database'

// 1. Register custom 'app://' protocol before app is ready
registerCustomProtocol()

// 2. Enforce Single-Instance Lock
const gotTheLock = app.requestSingleInstanceLock()

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
}
