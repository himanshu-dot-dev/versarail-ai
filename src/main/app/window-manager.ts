import { app, BrowserWindow, shell, session } from 'electron'
import { join } from 'path'

export function createMainWindow(): BrowserWindow {
  const isDev = !app.isPackaged
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    title: 'VersaRail AI',
    backgroundColor: '#090a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // Prevent flash of unstyled content
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Keyboard Shortcuts: Zoom In (Ctrl+=, Ctrl++), Zoom Out (Ctrl+-), Zoom Reset (Ctrl+0)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return

    const isCtrlOrCmd = input.control || input.meta
    if (!isCtrlOrCmd) return

    // Zoom In: '=' (unshifted '+'), '+' (shifted '='), or NumpadAdd
    if (input.key === '=' || input.key === '+' || input.code === 'Equal' || input.code === 'NumpadAdd') {
      const current = mainWindow.webContents.getZoomLevel()
      mainWindow.webContents.setZoomLevel(Math.min(current + 0.5, 4.0))
      event.preventDefault()
    }
    // Zoom Out: '-' or '_' or NumpadSubtract
    else if (input.key === '-' || input.key === '_' || input.code === 'Minus' || input.code === 'NumpadSubtract') {
      const current = mainWindow.webContents.getZoomLevel()
      mainWindow.webContents.setZoomLevel(Math.max(current - 0.5, -3.0))
      event.preventDefault()
    }
    // Zoom Reset: '0' or Numpad0
    else if (input.key === '0' || input.code === 'Digit0' || input.code === 'Numpad0') {
      mainWindow.webContents.setZoomLevel(0)
      event.preventDefault()
    }
  })

  // Security: Deny creation of new windows & open safe external HTTPS links in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      // Only permit safe external protocols in the default OS browser
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url)
      } else {
        console.warn(`[Security] Blocked attempt to open external URL with unsupported protocol: ${url}`)
      }
    } catch (err) {
      console.error(`[Security] Failed to parse URL in windowOpenHandler: ${url}`, err)
    }
    return { action: 'deny' }
  })

  // Security: Block in-app navigations away from the application origin
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // In dev, allow localhost/127.0.0.1
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      if (url.startsWith(process.env['ELECTRON_RENDERER_URL'])) {
        return
      }
    }
    // In production, allow app://
    if (url.startsWith('app://')) {
      return
    }

    event.preventDefault()
    console.warn(`[Security] Blocked unauthorized in-app navigation to: ${url}`)
  })

  // Apply Restrictive CSP Header in Session
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' ws: http:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
            : "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none';"
        ]
      }
    })
  })

  // Load renderer
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadURL('app://-/index.html')
  }

  return mainWindow
}
