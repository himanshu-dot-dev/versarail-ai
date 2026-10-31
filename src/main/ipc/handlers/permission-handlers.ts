import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { PermissionResponseSchema } from '@shared/schemas/permission.schema'
import { PermissionBroker } from '../../security/permission-broker'

export function registerPermissionHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.PERMISSION_RESPOND,
    async (event: IpcMainInvokeEvent, payload: unknown): Promise<{ success: boolean; error?: string }> => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.PERMISSION_RESPOND)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const parsed = PermissionResponseSchema.safeParse(payload)
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join(', ')
        return { success: false, error: `Invalid permission response: ${issues}` }
      }

      const broker = PermissionBroker.getInstance()
      const handled = broker.handleResponse({
        requestId: parsed.data.requestId,
        decision: parsed.data.decision,
        rememberScope: parsed.data.rememberScope
      })

      return { success: handled }
    }
  )
}

