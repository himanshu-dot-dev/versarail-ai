import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { SecretStorageService } from '../../security/safe-storage.service'
import { SqliteDatabase } from '../../storage/sqlite-database'
import { SaveCredentialSchema } from '@shared/schemas/provider.schema'
import { ProviderMetadataDTO } from '@shared/domain/models'
import { randomUUID } from 'crypto'

export function registerProviderHandlers(): void {
  const secretStore = SecretStorageService.getInstance()
  const db = SqliteDatabase.getInstance()

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

      const { providerId, label, apiKey, customEndpoint } = parseResult.data
      const id = randomUUID()

      try {
        const { isSessionOnly } = await secretStore.saveCredential({
          id,
          providerId,
          label,
          apiKey,
          customEndpoint
        })

        // Save metadata reference in SQLite (zero secret keys here!)
        const insertStmt = db.prepare(`
          INSERT INTO provider_metadata (id, provider_id, label, custom_endpoint, enabled, health_status, created_at)
          VALUES (?, ?, ?, ?, 1, 'healthy', ?)
        `)
        insertStmt.run(id, providerId, label, customEndpoint || null, new Date().toISOString())

        return { success: true, isSessionOnly }
      } catch (err) {
        console.error('[ProviderHandler] Failed to save credential:', err)
        return { success: false, error: 'Failed to securely store credential' }
      }
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
}

