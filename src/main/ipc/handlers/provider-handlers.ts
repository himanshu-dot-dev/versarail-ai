import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { SecretStorageService } from '../../security/safe-storage.service'
import { SqliteDatabase } from '../../storage/sqlite-database'
import { SaveCredentialSchema } from '@shared/schemas/provider.schema'
import { ProviderMetadataDTO, ModelDescriptorDTO, ProviderId } from '@shared/domain/models'
import { ProviderRegistry } from '../../providers/provider-registry'
import { ContextManager } from '../../agent/context-manager'
import { formatResetEta } from '../../providers/utils/reset-eta'
import { randomUUID } from 'crypto'

function normalizeKey(key: unknown): string {
  if (!key) return ''
  if (typeof key === 'object' && key !== null && 'result' in key) {
    const res = (key as { result: unknown }).result
    return Buffer.isBuffer(res) ? res.toString('utf-8') : String(res ?? '')
  }
  if (Buffer.isBuffer(key)) {
    return (key as Buffer).toString('utf-8')
  }
  return typeof key === 'string' ? key : String(key)
}

export function registerProviderHandlers(): void {
  const secretStore = SecretStorageService.getInstance()
  const db = SqliteDatabase.getInstance()
  const registry = ProviderRegistry.getInstance()

  // 1. List Providers & Credentials (Masked)
  ipcMain.handle(IPC_CHANNELS.PROVIDERS_LIST, async (event: IpcMainInvokeEvent): Promise<ProviderMetadataDTO[]> => {
    if (!SenderVerifier.verify(event, IPC_CHANNELS.PROVIDERS_LIST)) {
      throw new Error('Access denied: Unauthorized IPC sender')
    }

    const credentials = secretStore.listCredentialMetadata()
    const query = db.prepare('SELECT * FROM provider_metadata')
    const dbProviders = query.all() as {
      id: string
      provider_id: string
      label: string
      custom_endpoint: string | null
      enabled: number
      health_status: string
      cooldown_until: number | null
    }[]

    const dbMap = new Map(dbProviders.map((p) => [p.id, p]))

    return credentials.map((cred) => {
      const dbRecord = dbMap.get(cred.id)
      return {
        id: cred.id,
        providerId: cred.providerId as ProviderMetadataDTO['providerId'],
        label: cred.label,
        customEndpoint: cred.customEndpoint,
        enabled: dbRecord ? Boolean(dbRecord.enabled) : true,
        isConfigured: true,
        maskedKey: cred.maskedKey,
        healthStatus: (dbRecord?.health_status as ProviderMetadataDTO['healthStatus']) || 'healthy',
        lastValidatedAt: cred.createdAt
      }
    })
  })

  // 2. Save / Update Credential
  ipcMain.handle(
    IPC_CHANNELS.PROVIDERS_SAVE_CREDENTIAL,
    async (
      event: IpcMainInvokeEvent,
      rawPayload: unknown
    ): Promise<{ success: boolean; error?: string; isSessionOnly?: boolean }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.PROVIDERS_SAVE_CREDENTIAL)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const parseResult = SaveCredentialSchema.safeParse(rawPayload)
      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error.errors.map((e) => e.message).join(', ')
        }
      }

      const { id: incomingId, providerId, label, customEndpoint } = parseResult.data
      let apiKey = parseResult.data.apiKey ? parseResult.data.apiKey.trim() : ''
      const id = incomingId || randomUUID()

      // If updating an existing credential and no new apiKey provided, retain current key
      if (incomingId && !apiKey) {
        const existingKey = await secretStore.getDecryptedKey(incomingId)
        if (!existingKey) {
          return { success: false, error: 'Cannot update: existing credential key not found' }
        }
        apiKey = normalizeKey(existingKey)
      }

      if (!apiKey) {
        if (providerId === 'pollinations' || providerId === 'kilo') {
          apiKey = 'no-key'
        } else {
          return { success: false, error: 'API key cannot be empty' }
        }
      }

      try {
        const { isSessionOnly } = await secretStore.saveCredential({
          id,
          providerId,
          label,
          apiKey,
          customEndpoint: customEndpoint || undefined
        })

        // Upsert metadata reference in SQLite (zero secret keys here!)
        const upsertStmt = db.prepare(`
          INSERT INTO provider_metadata (id, provider_id, label, custom_endpoint, enabled, health_status, created_at)
          VALUES (?, ?, ?, ?, 1, 'healthy', ?)
          ON CONFLICT(id) DO UPDATE SET
            provider_id = excluded.provider_id,
            label = excluded.label,
            custom_endpoint = excluded.custom_endpoint
        `)
        upsertStmt.run(id, providerId, label, customEndpoint || null, new Date().toISOString())

        // Clear cooldown since credentials were saved or updated
        registry.clearCooldown(id)
        registry.clearAllModelCooldowns(id)

        return { success: true, isSessionOnly }
      } catch (err) {
        console.error('[ProviderHandler] Failed to save credential:', err)
        return { success: false, error: 'Failed to securely store credential' }
      }
    }
  )

  // 3. Set Provider Enabled / Disabled
  ipcMain.handle(
    IPC_CHANNELS.PROVIDERS_SET_ENABLED,
    async (
      event: IpcMainInvokeEvent,
      payload: { credentialId: string; enabled: boolean }
    ): Promise<{ success: boolean }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.PROVIDERS_SET_ENABLED)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const updateStmt = db.prepare('UPDATE provider_metadata SET enabled = ? WHERE id = ?')
      updateStmt.run(payload.enabled ? 1 : 0, payload.credentialId)

      return { success: true }
    }
  )

  // 3. Delete Credential
  ipcMain.handle(
    IPC_CHANNELS.PROVIDERS_DELETE_CREDENTIAL,
    async (event: IpcMainInvokeEvent, credentialId: string): Promise<{ success: boolean }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.PROVIDERS_DELETE_CREDENTIAL)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      secretStore.deleteCredential(credentialId)
      const deleteStmt = db.prepare('DELETE FROM provider_metadata WHERE id = ?')
      deleteStmt.run(credentialId)

      return { success: true }
    }
  )

  // 4. Validate Saved Credential
  ipcMain.handle(
    IPC_CHANNELS.PROVIDERS_VALIDATE_CREDENTIAL,
    async (
      event: IpcMainInvokeEvent,
      credentialId: string
    ): Promise<{ valid: boolean; latencyMs: number; modelsCount: number; error?: string }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.PROVIDERS_VALIDATE_CREDENTIAL)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const meta = secretStore.getCredentialMetadata(credentialId)
      const rawApiKey = await secretStore.getDecryptedKey(credentialId)
      if (!meta || !rawApiKey) {
        return { valid: false, latencyMs: 0, modelsCount: 0, error: 'Credential not found in secure storage' }
      }
      const apiKey = normalizeKey(rawApiKey)

      const adapter = registry.getAdapter(meta.providerId as ProviderId)
      if (!adapter) {
        return { valid: false, latencyMs: 0, modelsCount: 0, error: `No adapter registered for provider ${meta.providerId}` }
      }

      const result = await adapter.validateKey(apiKey, meta.customEndpoint)

      // Update SQLite health status
      const status = result.valid ? 'healthy' : 'unauthenticated'
      const updateStmt = db.prepare('UPDATE provider_metadata SET health_status = ? WHERE id = ?')
      updateStmt.run(status, credentialId)

      return {
        valid: result.valid,
        latencyMs: result.latencyMs,
        modelsCount: result.modelsCount,
        error: result.error
      }
    }
  )

  // 5. Test Provider Connection (for new or existing keys)
  ipcMain.handle(
    IPC_CHANNELS.PROVIDERS_TEST_CONNECTION,
    async (
      event: IpcMainInvokeEvent,
      payload: { providerId: string; apiKey?: string; credentialId?: string; customEndpoint?: string }
    ): Promise<{ success: boolean; latencyMs: number; modelsCount: number; error?: string }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.PROVIDERS_TEST_CONNECTION)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      let keyToTest: string | undefined = payload.apiKey ? normalizeKey(payload.apiKey) : undefined
      let endpoint = payload.customEndpoint

      if (!keyToTest && payload.credentialId) {
        const meta = secretStore.getCredentialMetadata(payload.credentialId)
        const decryptedKey = await secretStore.getDecryptedKey(payload.credentialId)
        if (decryptedKey) {
          keyToTest = normalizeKey(decryptedKey)
          endpoint = endpoint || meta?.customEndpoint
        }
      }

      if (!keyToTest) {
        if (payload.providerId === 'pollinations' || payload.providerId === 'kilo') {
          keyToTest = 'no-key'
        } else {
          return { success: false, latencyMs: 0, modelsCount: 0, error: 'No API key provided for connection test' }
        }
      }

      const adapter = registry.getAdapter(payload.providerId as ProviderId)
      if (!adapter) {
        return { success: false, latencyMs: 0, modelsCount: 0, error: `No adapter registered for provider ${payload.providerId}` }
      }

      const result = await adapter.validateKey(keyToTest, endpoint)

      return {
        success: result.valid,
        latencyMs: result.latencyMs,
        modelsCount: result.modelsCount,
        error: result.error
      }
    }
  )

  // 6. List Available Models (Filtered strictly by enabled status and configuration)
  ipcMain.handle(
    IPC_CHANNELS.MODELS_LIST_AVAILABLE,
    async (event: IpcMainInvokeEvent, providerId?: string): Promise<ModelDescriptorDTO[]> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.MODELS_LIST_AVAILABLE)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      // Query database for configured provider metadata and their enabled statuses
      let dbProviders: Array<{ id: string; provider_id: string; enabled: number }> = []
      try {
        dbProviders = db.prepare('SELECT id, provider_id, enabled FROM provider_metadata').all() as Array<{
          id: string
          provider_id: string
          enabled: number
        }>
      } catch {
        // In isolated test environments without database, continue gracefully
      }

      const disabledProviders = new Set<string>()
      const enabledProviders = new Set<string>()

      for (const row of dbProviders) {
        if (row.enabled === 0) {
          disabledProviders.add(row.provider_id)
        } else {
          enabledProviders.add(row.provider_id)
        }
      }

      // Check workspace privacy allowed providers
      let privacyAllowed: Set<string> | null = null
      try {
        const privacy = ContextManager.getInstance().getPrivacySettings()
        if (Array.isArray(privacy.allowedProviders)) {
          privacyAllowed = new Set(privacy.allowedProviders)
        }
      } catch {
        // Ignore in tests
      }

      const adapters = providerId
        ? [registry.getAdapter(providerId as ProviderId)].filter(Boolean)
        : registry.getAllAdapters()

      const allModels: ModelDescriptorDTO[] = []

      for (const adapter of adapters) {
        if (!adapter) continue

        // If provider is explicitly disabled in provider_metadata, omit its models from chat
        if (disabledProviders.has(adapter.id) && !enabledProviders.has(adapter.id)) {
          continue
        }

        // If workspace privacy settings disallowed this provider, omit its models
        if (privacyAllowed && !privacyAllowed.has(adapter.id)) {
          continue
        }

        // Retrieve credentials if any
        const creds = secretStore.listCredentialMetadata().filter((c) => c.providerId === adapter.id)

        // A provider is only available in chat if it is actively enabled in provider_metadata
        // (or if it's a keyless free tier that hasn't been explicitly disabled)
        const isKeyless = adapter.id === 'pollinations' || adapter.id === 'kilo'
        const isExplicitlyEnabled = enabledProviders.has(adapter.id)
        if (!isExplicitlyEnabled && !isKeyless && !providerId && dbProviders.length > 0) {
          continue
        }

        let key = ''
        let customEndpoint: string | undefined
        if (creds.length > 0) {
          const decrypted = await secretStore.getDecryptedKey(creds[0].id)
          if (decrypted) {
            key = normalizeKey(decrypted)
          }
          customEndpoint = creds[0].customEndpoint
        } else if (isKeyless) {
          key = 'no-key'
        }

        const models = await adapter.listModels(key, customEndpoint)
        allModels.push(...models)
      }

      return allModels
    }
  )

  // 7. Get Provider Health Statuses & Cooldown ETAs
  ipcMain.handle(
    IPC_CHANNELS.PROVIDERS_GET_HEALTH_STATUSES,
    async (event: IpcMainInvokeEvent) => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.PROVIDERS_GET_HEALTH_STATUSES)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const credentials = secretStore.listCredentialMetadata()
      const healthMap: Record<string, {
        providerId: string
        status: 'healthy' | 'degraded' | 'cooldown' | 'quota_exhausted'
        cooldownUntil: number | null
        cooldownEta?: string | null
        activeRequests: number
        lastError?: string
      }> = {}

      const now = Date.now()
      for (const cred of credentials) {
        const cooldownUntil = registry.getCooldownExpiry(cred.id)
        const state = registry.getKeyState(cred.id)
        const isCooldown = cooldownUntil !== null && cooldownUntil > now

        let status: 'healthy' | 'degraded' | 'cooldown' | 'quota_exhausted' = 'healthy'
        if (isCooldown) {
          status = state?.lastError?.includes('quota') ? 'quota_exhausted' : 'cooldown'
        } else if (state?.lastError) {
          status = 'degraded'
        }

        healthMap[cred.id] = {
          providerId: cred.providerId,
          status,
          cooldownUntil,
          cooldownEta: formatResetEta(cooldownUntil, now),
          activeRequests: state?.activeRequests || 0,
          lastError: state?.lastError
        }
      }

      return healthMap
    }
  )
}
