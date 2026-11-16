/**
 * VersaRail AI Agent Harness - Settings & Privacy IPC Handlers
 * Handles global configuration, workspace data-sharing policies, and retention cleanup.
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { ContextManager } from '../../agent/context-manager'
import {
  PrivacySettingsSchema,
  PrivacySettingsDTO,
  AgentAppearanceSettingsSchema,
  AgentAppearanceSettingsDTO
} from '@shared/schemas/settings.schema'

export function registerSettingsHandlers(): void {
  const contextManager = ContextManager.getInstance()

  // 1. Get Settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    async (
      event: IpcMainInvokeEvent
    ): Promise<{ privacy: PrivacySettingsDTO; appearance: AgentAppearanceSettingsDTO }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.SETTINGS_GET)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      return {
        privacy: contextManager.getPrivacySettings(),
        appearance: contextManager.getAppearanceSettings()
      }
    }
  )

  // 2. Save Settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SAVE,
    async (
      event: IpcMainInvokeEvent,
      payload: unknown
    ): Promise<{ success: boolean; error?: string }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.SETTINGS_SAVE)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const body = payload as { privacy?: unknown; appearance?: unknown } | undefined

      // Check if payload contains grouped sections or flat privacy schema
      if (body?.privacy !== undefined || body?.appearance !== undefined) {
        if (body.privacy) {
          const parsedPrivacy = PrivacySettingsSchema.safeParse(body.privacy)
          if (parsedPrivacy.success) {
            contextManager.savePrivacySettings(parsedPrivacy.data)
          }
        }
        if (body.appearance) {
          const parsedAppearance = AgentAppearanceSettingsSchema.safeParse(body.appearance)
          if (parsedAppearance.success) {
            contextManager.saveAppearanceSettings(parsedAppearance.data)
          }
        }
        return { success: true }
      }

      // Legacy direct privacy payload fallback
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

