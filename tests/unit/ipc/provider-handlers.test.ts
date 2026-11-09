import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IPC_CHANNELS } from '../../../src/shared/events/ipc-channels'
import { SenderVerifier } from '../../../src/main/ipc/sender-verifier'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import { registerProviderHandlers } from '../../../src/main/ipc/handlers/provider-handlers'

const { mockHandlers } = vi.hoisted(() => {
  return {
    mockHandlers: new Map<string, (...args: any[]) => Promise<any>>()
  }
})

vi.mock('electron', () => {
  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: (...args: any[]) => Promise<any>) => {
        mockHandlers.set(channel, handler)
      })
    },
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (str: string) => Buffer.from(str),
      decryptString: (buf: Buffer) => buf.toString()
    },
    app: {
      getPath: () => ':memory:'
    }
  }
})

describe('Provider IPC Handlers - MODELS_LIST_AVAILABLE Filtering', () => {
  let db: SqliteDatabase

  beforeEach(() => {
    mockHandlers.clear()
    vi.clearAllMocks()
    SenderVerifier.registerAllowedOrigin('app://-')
    db = SqliteDatabase.getInstance(':memory:')
    registerProviderHandlers()
  })

  it('filters out models belonging to disabled providers from MODELS_LIST_AVAILABLE', async () => {
    // Insert Cohere as disabled (enabled = 0) and OpenRouter as enabled (enabled = 1)
    db.prepare(`
      INSERT INTO provider_metadata (id, provider_id, label, custom_endpoint, enabled, health_status, created_at)
      VALUES 
        ('cred-cohere', 'cohere', 'Cohere', null, 0, 'healthy', datetime('now')),
        ('cred-openrouter', 'openrouter', 'OpenRouter', null, 1, 'healthy', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled
    `).run()

    const listModelsHandler = mockHandlers.get(IPC_CHANNELS.MODELS_LIST_AVAILABLE)
    expect(listModelsHandler).toBeDefined()

    const mockEvent = {
      senderFrame: {
        url: 'app://-/index.html'
      }
    } as any

    const models = await listModelsHandler!(mockEvent)
    expect(Array.isArray(models)).toBe(true)

    // Cohere models should NOT be returned because Cohere is disabled
    const hasCohere = models.some((m: any) => m.providerId === 'cohere')
    expect(hasCohere).toBe(false)

    // OpenRouter models should be present because OpenRouter is enabled
    const hasOpenRouter = models.some((m: any) => m.providerId === 'openrouter')
    expect(hasOpenRouter).toBe(true)
  })
})

