import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const normalizedProjectRoot = projectRoot.replace(/\\/g, '/')
const workspaceName = path.basename(projectRoot)
const rendererDist = path.join(projectRoot, 'out', 'renderer')

const PORT = 4173

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon'
}

const electronApiPolyfill = `
<script>
window.electronApi = {
  getSystemInfo: async () => ({ platform: 'win32', arch: 'x64', version: '10.0.22631', appVersion: '0.1.0' }),
  ping: async () => 'pong',
  minimizeWindow: () => console.log('[Polyfill] minimizeWindow'),
  maximizeWindow: () => console.log('[Polyfill] maximizeWindow'),
  closeWindow: () => console.log('[Polyfill] closeWindow'),
  isWindowMaximized: async () => false,

  listProviders: async () => [
    { id: 'cred-1', providerId: 'gemini', label: 'Google AI Studio', maskedKey: 'AQ.Ab8...IXMrQ', isSessionOnly: false, createdAt: new Date().toISOString() },
    { id: 'cred-2', providerId: 'pollinations', label: 'Pollinations (Keyless Free)', maskedKey: 'Keyless (Free)', isSessionOnly: false, createdAt: new Date().toISOString() },
    { id: 'cred-3', providerId: 'custom', label: 'Grok Gateway', maskedKey: 'xai-...', customEndpoint: 'http://127.0.0.1:20128/v1', isSessionOnly: false, createdAt: new Date().toISOString() }
  ],
  saveCredential: async () => ({ success: true }),
  deleteCredential: async () => ({ success: true }),
  setProviderEnabled: async () => ({ success: true }),
  validateCredential: async () => ({ valid: true }),
  testProviderConnection: async () => ({ success: true, latencyMs: 240, modelsCount: 50 }),
  getProviderHealthStatuses: async () => ({
    gemini: { healthy: true, latencyMs: 240 },
    pollinations: { healthy: true, latencyMs: 310 },
    custom: { healthy: true, latencyMs: 12 }
  }),

  listModels: async () => [
    { id: 'gemini-3-flash-preview', providerId: 'gemini', name: 'Gemini 3.0 Flash Preview', contextWindow: 1048576, outputLimit: 65536, supportsTools: true, supportsStreaming: true, isFreeTierAvailable: true },
    { id: 'openai', providerId: 'pollinations', name: 'Pollinations GPT-OSS 20B (Keyless)', contextWindow: 128000, outputLimit: 4096, supportsTools: true, supportsStreaming: true, isFreeTierAvailable: true },
    { id: 'grok-2', providerId: 'custom', name: 'Grok 2.0 (xAI)', contextWindow: 128000, outputLimit: 8192, supportsTools: true, supportsStreaming: true, isFreeTierAvailable: false }
  ],

  respondPermission: async () => {},
  onPermissionRequest: (callback) => () => {},

  listConversations: async () => [
    { id: 'conv-browser-1', title: 'Interactive Browser Verification Session', selectedModel: 'gemini-3-flash-preview', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  getConversation: async (id) => ({
    conversation: { id, title: 'Interactive Browser Verification Session', selectedModel: 'gemini-3-flash-preview', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    messages: [
      { id: 'msg-1', conversationId: id, role: 'user', content: 'Explain how the VersaRail AI Agent Harness works in the browser.', createdAt: new Date().toISOString() },
      { id: 'msg-2', conversationId: id, role: 'assistant', content: 'VersaRail AI provides a decoupled agentic runtime. In browser environments, it renders a responsive React single-page interface with real-time UI components including the Model Selector, TodoDock, DiffViewer, and Sidebar navigation.', createdAt: new Date().toISOString() }
    ]
  }),
  deleteConversation: async () => ({ success: true }),
  sendPrompt: async ({ prompt }) => {
    console.log('[Polyfill] sendPrompt received:', prompt)
    setTimeout(() => {
      if (window._onStreamTokenCb) {
        window._onStreamTokenCb({ delta: 'Browser response: ' + prompt, isComplete: true })
      }
    }, 500)
    return { success: true, runId: 'run-browser-' + Date.now() }
  },
  cancelRun: async () => ({ success: true }),
  onStreamToken: (callback) => {
    window._onStreamTokenCb = callback
    return () => { window._onStreamTokenCb = null }
  },
  onFailoverEvent: () => () => {},

  getWorkspace: async () => ({ path: ${JSON.stringify(normalizedProjectRoot)}, name: ${JSON.stringify(workspaceName)} }),
  setWorkspace: async () => ({ success: true }),
  selectWorkspaceFolder: async () => ${JSON.stringify(normalizedProjectRoot)},
  listWorkspaceFiles: async () => ['README.md', 'package.json', 'electron.vite.config.ts', 'src/main/index.ts', 'src/renderer/src/app/App.tsx'],
  getPendingChanges: async () => [],
  getGitDiff: async () => ({ diff: '' }),

  getUsageQuotas: async () => [
    { providerId: 'gemini', providerName: 'Google AI Studio', tier: 'free', resetAt: Date.now() + 86400000, metrics: [{ name: 'Requests Per Day', current: 142, limit: 1500, unit: 'req' }] }
  ],
  getSettings: async () => ({
    autoSwitch: true,
    maxBudget: 10.0,
    preferredProvider: 'gemini',
    theme: 'versarail-dark',
    contextWindowBudgetTokens: 128000,
    autoSummarizeContext: true
  }),
  updateSettings: async () => ({ success: true }),
  getExecutionAuditLogs: async () => []
}
console.log('✓ Injected window.electronApi browser bridge')
</script>
`

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  let reqPath = url.pathname

  if (reqPath === '/' || reqPath === '/index.html') {
    const indexPath = path.join(rendererDist, 'index.html')
    if (!fs.existsSync(indexPath)) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('index.html not found. Please run electron-vite build first.')
      return
    }

    let html = fs.readFileSync(indexPath, 'utf8')
    // Replace restrictive CSP with permissive browser CSP
    html = html.replace(
      /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i,
      '<meta http-equiv="Content-Security-Policy" content="default-src * \'unsafe-inline\' \'unsafe-eval\' data: blob:;" />'
    )
    // Inject polyfill before </head>
    html = html.replace('</head>', `${electronApiPolyfill}\n</head>`)

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
    return
  }

  // Sanitize path to prevent directory traversal
  const safePath = path.normalize(path.join(rendererDist, reqPath))
  if (!safePath.startsWith(rendererDist)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': contentType })
    fs.createReadStream(safePath).pipe(res)
    return
  }

  // Fallback to index.html for SPA routes
  const indexPath = path.join(rendererDist, 'index.html')
  let html = fs.readFileSync(indexPath, 'utf8')
  html = html.replace(
    /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i,
    '<meta http-equiv="Content-Security-Policy" content="default-src * \'unsafe-inline\' \'unsafe-eval\' data: blob:;" />'
  )
  html = html.replace('</head>', `${electronApiPolyfill}\n</head>`)
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✓ VersaRail Local Browser Test Server running on http://127.0.0.1:${PORT}`)
})
