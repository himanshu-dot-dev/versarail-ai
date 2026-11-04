import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const rendererDist = path.join(projectRoot, 'out/renderer')
const PORT = 5173

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2'
}

const mockApiScript = `
<script>
window.electronApi = {
  getSystemInfo: async () => ({
    version: '0.1.0-alpha',
    electronVersion: '45.0.0',
    nodeVersion: '24.0.0',
    platform: 'win32',
    arch: 'x64'
  }),
  ping: async () => 'pong',
  minimizeWindow: () => console.log('Minimize window'),
  maximizeWindow: () => console.log('Maximize window'),
  closeWindow: () => console.log('Close window'),
  isWindowMaximized: async () => false,

  listProviders: async () => [
    {
      id: 'cred-gemini',
      providerId: 'gemini',
      label: 'Google Gemini',
      description: 'Official Gemini 2.5 Flash / Pro API with free tier quotas',
      enabled: true,
      hasKey: true,
      isBuiltin: true,
      modelsCount: 4,
      cooldownUntil: null
    },
    {
      id: 'cred-mistral',
      providerId: 'mistral',
      label: 'Mistral AI',
      description: 'La Plateforme Codestral & Mistral Small free tier',
      enabled: true,
      hasKey: true,
      isBuiltin: true,
      modelsCount: 3,
      cooldownUntil: null
    },
    {
      id: 'cred-groq',
      providerId: 'groq',
      label: 'Groq Cloud',
      description: 'Ultra-fast LPU inference hosting LLaMA 3.3 70B free tier',
      enabled: true,
      hasKey: true,
      isBuiltin: true,
      modelsCount: 3,
      cooldownUntil: null
    },
    {
      id: 'cred-cerebras',
      providerId: 'cerebras',
      label: 'Cerebras Cloud',
      description: 'Wafer-scale LLaMA 3.1 70B free tier with high TPS',
      enabled: true,
      hasKey: true,
      isBuiltin: true,
      modelsCount: 2,
      cooldownUntil: null
    },
    {
      id: 'cred-nvidia',
      providerId: 'nvidia',
      label: 'NVIDIA NIM',
      description: 'NVIDIA API Catalog with 1000 free inference credits',
      enabled: true,
      hasKey: true,
      isBuiltin: true,
      modelsCount: 5,
      cooldownUntil: null
    },
    {
      id: 'cred-openrouter',
      providerId: 'openrouter',
      label: 'OpenRouter',
      description: 'Unified router supporting free :free models',
      enabled: true,
      hasKey: true,
      isBuiltin: true,
      modelsCount: 12,
      cooldownUntil: null
    },
    {
      id: 'cred-kilo',
      providerId: 'kilo',
      label: 'Kilo Code Gateway',
      description: 'Autonomous agent gateway with free rotation pool',
      enabled: true,
      hasKey: true,
      isBuiltin: true,
      modelsCount: 6,
      cooldownUntil: null
    },
    {
      id: 'cred-pollinations',
      providerId: 'pollinations',
      label: 'Pollinations AI',
      description: 'Zero-config free tier AI model gateway',
      enabled: true,
      hasKey: false,
      isBuiltin: true,
      modelsCount: 4,
      cooldownUntil: null
    }
  ],

  getProviderHealthStatuses: async () => ({
    gemini: { state: 'ok', strikes: 0, cooldownUntil: null, lastUsedAt: Date.now() - 30000 },
    mistral: { state: 'ok', strikes: 0, cooldownUntil: null, lastUsedAt: Date.now() - 120000 },
    groq: { state: 'ok', strikes: 0, cooldownUntil: null, lastUsedAt: Date.now() - 250000 },
    cerebras: { state: 'ok', strikes: 0, cooldownUntil: null, lastUsedAt: Date.now() - 600000 },
    nvidia: { state: 'ok', strikes: 0, cooldownUntil: null, lastUsedAt: null },
    openrouter: { state: 'ok', strikes: 0, cooldownUntil: null, lastUsedAt: null },
    kilo: { state: 'ok', strikes: 0, cooldownUntil: null, lastUsedAt: null },
    pollinations: { state: 'ok', strikes: 0, cooldownUntil: null, lastUsedAt: null }
  }),

  listModels: async (providerId) => {
    const all = [
      { id: 'ai-agent-auto', name: 'AI Agent (Auto-Switch)', providerId: 'auto', description: 'Universal failover across all free providers', contextWindow: 128000, supportsTools: true, free: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerId: 'gemini', description: 'Google multimodal high-speed model', contextWindow: 1048576, supportsTools: true, free: true },
      { id: 'mistral-small-latest', name: 'Mistral Small 24B', providerId: 'mistral', description: 'Mistral fast reasoning model', contextWindow: 32768, supportsTools: true, free: true },
      { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile', providerId: 'groq', description: 'Groq ultra-fast LPU inference', contextWindow: 128000, supportsTools: true, free: true },
      { id: 'llama3.1-70b', name: 'LLaMA 3.1 70B', providerId: 'cerebras', description: 'Cerebras wafer-scale engine', contextWindow: 8192, supportsTools: true, free: true }
    ];
    if (!providerId || providerId === 'auto') return all;
    return all.filter(m => m.providerId === providerId);
  },

  getCurrentWorkspace: async () => ({
    path: '${projectRoot.replace(/\\/g, '\\\\')}',
    name: 'ai-agent-harness'
  }),

  setWorkspace: async (path) => ({
    path,
    name: path.split(/[\\\\/]/).pop() || path
  }),

  selectWorkspaceFolder: async () => ({
    canceled: false,
    path: '${projectRoot.replace(/\\/g, '\\\\')}',
    name: 'ai-agent-harness'
  }),

  inspectWorkspaceFiles: async () => ({
    dirs: ['src', 'out', 'tests'],
    files: ['package.json', 'README.md', 'tsconfig.json']
  }),

  listConversations: async () => [
    {
      id: 'conv-e2e-demo',
      title: 'Auto-Switching Architecture Session',
      selectedModel: 'AI Agent (Auto-Switch)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],

  getConversation: async (id) => ({
    id: id || 'conv-e2e-demo',
    title: 'Auto-Switching Architecture Session',
    selectedModel: 'AI Agent (Auto-Switch)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: 'Universal AI Agent ready with multi-provider endurance. Free provider failover mesh is active across Gemini, Mistral, Groq, Cerebras, and OpenRouter.',
        timestamp: Date.now() - 60000,
        model: 'AI Agent'
      }
    ]
  }),

  deleteConversation: async () => ({ success: true }),

  _streamListeners: [],
  onStreamToken: (cb) => {
    window.electronApi._streamListeners.push(cb);
    return () => {
      window.electronApi._streamListeners = window.electronApi._streamListeners.filter(l => l !== cb);
    };
  },

  _failoverListeners: [],
  onFailoverEvent: (cb) => {
    window.electronApi._failoverListeners.push(cb);
    return () => {
      window.electronApi._failoverListeners = window.electronApi._failoverListeners.filter(l => l !== cb);
    };
  },

  _permissionListeners: [],
  onPermissionRequest: (cb) => {
    window.electronApi._permissionListeners.push(cb);
    return () => {
      window.electronApi._permissionListeners = window.electronApi._permissionListeners.filter(l => l !== cb);
    };
  },
  respondPermission: async () => {},

  sendPrompt: async (payload) => {
    const runId = 'run-' + Date.now();
    setTimeout(async () => {
      // Simulate failover notification to show dynamic resilience
      window.electronApi._failoverListeners.forEach(l => l({
        fromProvider: 'gemini',
        toProvider: 'groq',
        reason: 'Rate limit (429) detected on Gemini. Automatically switched to Groq LLaMA-3.3-70B.'
      }));

      // Stream assistant response chunks
      const chunks = [
        'I am ',
        'your AI Agent ',
        'powered by ',
        'the Universal Auto-Switching mesh. ',
        '\\n\\n',
        '**Resilience Report:**\\n',
        '- Failover policy: \`auto/free\`\\n',
        '- Active pool: Gemini 2.5 Flash, Mistral Small 24B, Groq LLaMA 3.3 70B, Cerebras LLaMA 3.1\\n',
        '- Status: All providers active with LRU health rotation\\n',
        '- Task endurance: Operating with automatic context compaction and OS wake-lock.'
      ];

      for (const chunk of chunks) {
        await new Promise(r => setTimeout(r, 60));
        window.electronApi._streamListeners.forEach(l => l({
          runId,
          delta: chunk,
          isComplete: false
        }));
      }

      window.electronApi._streamListeners.forEach(l => l({
        runId,
        delta: '',
        isComplete: true
      }));
    }, 100);

    return { runId, success: true };
  },

  cancelRun: async () => ({ success: true }),

  getSettings: async () => ({
    defaultModel: 'AI Agent (Auto-Switch)',
    autoApproveReadOnly: true,
    autoSwitchCooldownSeconds: 60,
    theme: 'versarail-dark'
  }),
  saveSettings: async () => ({ success: true }),
  purgeData: async () => ({ success: true }),

  saveCredential: async () => ({ success: true }),
  deleteCredential: async () => ({ success: true }),
  setProviderEnabled: async () => ({ success: true }),
  validateCredential: async () => ({ valid: true }),
  testProviderConnection: async () => ({ success: true, latencyMs: 240, modelsCount: 4 }),

  onTerminalData: () => () => {},
  writeTerminal: () => {},
  resizeTerminal: () => {},
  closeTerminal: () => {}
};
console.log('[MCP Server Mock] window.electronApi initialized successfully.');
</script>
`

const server = http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] || '/'
  let relativeFilePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '')
  let filePath = path.join(rendererDist, relativeFilePath)

  // Fallback to index.html for SPA client navigation
  if (!fs.existsSync(filePath)) {
    filePath = path.join(rendererDist, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('File not found')
      return
    }

    if (ext === '.html') {
      let html = data.toString('utf8')
      // Inject permissive CSP and electronApi bridge
      html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '')
      html = html.replace('</head>', `${mockApiScript}\n</head>`)
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      })
      res.end(html)
      return
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    })
    res.end(data)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[MCP Test Server] Live renderer served at http://127.0.0.1:${PORT}`)
})
