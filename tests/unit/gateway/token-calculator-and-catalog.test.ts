import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { SqliteDatabase } from '../../../src/main/storage/sqlite-database'
import { SecretStorageService } from '../../../src/main/security/safe-storage.service'
import {
  classifyBudgetKind,
  formatCompactTokens,
  monthlyBudgetScore,
  parseBudget
} from '../../../src/main/gateway/budget-parser'
import { TokenTelemetryService } from '../../../src/main/gateway/token-telemetry'
import { SenderVerifier } from '../../../src/main/ipc/sender-verifier'
import { registerGatewayHandlers } from '../../../src/main/ipc/handlers/gateway-handlers'
import { IPC_CHANNELS } from '../../../src/shared/events/ipc-channels'

const { mockHandlers } = vi.hoisted(() => ({
  mockHandlers: new Map<string, (...args: any[]) => Promise<any>>()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: any[]) => Promise<any>) => {
      mockHandlers.set(channel, handler)
    })
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (str: string) => Buffer.from(str, 'utf-8'),
    decryptString: (buf: Buffer) => buf.toString('utf-8')
  },
  app: {
    getPath: () => os.tmpdir()
  }
}))

describe('Per-Provider Token Budget Calculator & Usage Telemetry', () => {
  let tempDir: string
  let dbPath: string
  let secretStore: SecretStorageService

  beforeEach(() => {
    mockHandlers.clear()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'versarail-token-calc-'))
    dbPath = path.join(tempDir, 'token-calc.db')

    // @ts-expect-error Reset singleton
    SqliteDatabase.instance = null
    // @ts-expect-error Reset singleton
    SecretStorageService.instance = null
    TokenTelemetryService.resetInstance()

    const db = SqliteDatabase.getInstance(dbPath)
    db.runMigrations()
    secretStore = SecretStorageService.getInstance(path.join(tempDir, 'secrets.json'))
  })

  afterEach(() => {
    try {
      SqliteDatabase.getInstance().close()
    } catch {
      // ignore
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('parses monthly token budgets accurately and ignores rate-limit-only labels', () => {
    expect(parseBudget('~120M')).toBe(120_000_000)
    expect(parseBudget('~50-100M')).toBe(100_000_000)
    expect(parseBudget('free · 500K tokens/day')).toBe(15_000_000)
    expect(parseBudget('free · 1M tokens/24h')).toBe(30_000_000)
    expect(parseBudget('free · 40 RPM')).toBe(0)
    expect(parseBudget('free · 14.4K rpd')).toBe(0)
    expect(parseBudget('free · 200/hr')).toBe(0)
    expect(parseBudget('credits-based')).toBe(0)

    expect(classifyBudgetKind('~30M', 30_000_000)).toBe('documented')
    expect(classifyBudgetKind('credits-based', 0)).toBe('credits')
    expect(classifyBudgetKind('free · 40 RPM', 0)).toBe('unpublished')

    expect(monthlyBudgetScore({ monthlyTokenBudget: '~15M', tpdLimit: 1_000_000 })).toBe(30_000_000)
    expect(formatCompactTokens(1_250_000_000)).toBe('1.3B')
    expect(formatCompactTokens(120_000_000)).toBe('120M')
    expect(formatCompactTokens(14_400)).toBe('14K')
  })

  it('computes pool-deduplicated monthly token budgets scaled by usable API keys', async () => {
    await secretStore.saveCredential({
      id: 'cred-gemini-1',
      providerId: 'gemini',
      label: 'Gemini Key 1',
      apiKey: 'AIzaSyMockGeminiKey123456789012345678'
    })
    await secretStore.saveCredential({
      id: 'cred-cerebras-1',
      providerId: 'cerebras',
      label: 'Cerebras Key 1',
      apiKey: 'csk-mockCerebrasKey1111111111111111'
    })
    await secretStore.saveCredential({
      id: 'cred-cerebras-2',
      providerId: 'cerebras',
      label: 'Cerebras Key 2',
      apiKey: 'csk-mockCerebrasKey2222222222222222'
    })

    const telemetry = TokenTelemetryService.getInstance()
    telemetry.recordUsage({
      providerId: 'cerebras',
      credentialId: 'cred-cerebras-1',
      modelId: 'llama3.3-70b',
      inputTokens: 1200,
      outputTokens: 800,
      tokenSource: 'upstream'
    })
    telemetry.recordUsage({
      providerId: 'gemini',
      credentialId: 'cred-gemini-1',
      modelId: 'gemini-3.5-flash',
      inputTokens: 500,
      outputTokens: 300,
      tokenSource: 'estimated'
    })

    const summary = telemetry.getTokenUsageSummary()
    const cerebrasRow = summary.providers.find((p) => p.providerId === 'cerebras')
    const geminiRow = summary.providers.find((p) => p.providerId === 'gemini')

    expect(cerebrasRow).toBeDefined()
    expect(cerebrasRow!.usableKeyCount).toBe(2)
    // Shared cerebras pool (1M TPD = 30M/mo) is deduplicated across Cerebras models and scaled x2 keys = 60M
    expect(cerebrasRow!.monthlyTokenBudgetTokens).toBe(60_000_000)
    expect(cerebrasRow!.inputTokensMonth).toBe(1200)
    expect(cerebrasRow!.outputTokensMonth).toBe(800)
    expect(cerebrasRow!.usedTokensMonth).toBe(2000)
    expect(cerebrasRow!.remainingTokensMonth).toBe(60_000_000 - 2000)

    expect(geminiRow).toBeDefined()
    expect(geminiRow!.usableKeyCount).toBe(1)
    expect(geminiRow!.monthlyTokenBudgetTokens).toBe(120_000_000)
    expect(geminiRow!.usedTokensMonth).toBe(800)

    expect(summary.totalUsedMonthTokens).toBe(2800)
    expect(summary.totalMonthlyBudgetTokens).toBe(180_000_000)
    expect(summary.totalRemainingMonthTokens).toBe(180_000_000 - 2800)
  })

  it('enforces SenderVerifier on ANALYTICS_GET_TOKEN_BUDGET IPC handler', async () => {
    SenderVerifier.registerAllowedOrigin('app://-')
    registerGatewayHandlers()

    const handler = mockHandlers.get(IPC_CHANNELS.ANALYTICS_GET_TOKEN_BUDGET)
    expect(handler).toBeDefined()

    const trustedEvent = { senderFrame: { url: 'app://-/index.html' } } as any
    const untrustedEvent = { senderFrame: { url: 'https://evil.example.com' } } as any

    await expect(handler!(untrustedEvent)).rejects.toThrow('Unauthorized IPC sender')

    const res = await handler!(trustedEvent)
    expect(res).toBeDefined()
    expect(Array.isArray(res.providers)).toBe(true)
    expect(Array.isArray(res.models)).toBe(true)
  })
})
