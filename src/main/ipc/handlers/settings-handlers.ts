/**
 * VersaRail AI Agent Harness - Settings & Privacy IPC Handlers
 * Handles global configuration, workspace data-sharing policies, and retention cleanup.
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { ContextManager } from '../../agent/context-manager'
import { PrivacySettingsSchema, PrivacySettingsDTO } from '@shared/schemas/settings.schema'

export function registerSettingsHandlers(): void {
  const contextManager = ContextManager.getInstance()

  // 1. Get Settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    async (event: IpcMainInvokeEvent): Promise<{ privacy: PrivacySettingsDTO }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.SETTINGS_GET)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      return {
        privacy: contextManager.getPrivacySettings()
      }
    }
  )

  // 2. Save Privacy Settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SAVE,
    async (
      event: IpcMainInvokeEvent,
      payload: unknown
    ): Promise<{ success: boolean; error?: string }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.SETTINGS_SAVE)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const parsed = PrivacySettingsSchema.safeParse(payload)
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join(', ')
        return { success: false, error: `Invalid privacy settings: ${issues}` }
      }

      contextManager.savePrivacySettings(parsed.data)
      return { success: true }
    }
  )

  // 3. Purge Retention Data
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_PURGE_DATA,
    async (
      event: IpcMainInvokeEvent,
      retentionDays: number = 0
    ): Promise<{ success: boolean; purgedConversations: number }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.SETTINGS_PURGE_DATA)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const result = contextManager.purgeOldData(retentionDays)
      return {
        success: true,
        purgedConversations: result.purgedConversations
      }
    }
  )
}

