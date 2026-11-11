import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { TokenTelemetryService } from '../../gateway/token-telemetry'

export function registerGatewayHandlers(): void {
  const telemetry = TokenTelemetryService.getInstance()

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_TOKEN_BUDGET, async (event: IpcMainInvokeEvent) => {
    if (!SenderVerifier.verify(event, IPC_CHANNELS.ANALYTICS_GET_TOKEN_BUDGET)) {
      throw new Error('Access denied: Unauthorized IPC sender')
    }
    return telemetry.getTokenUsageSummary()
  })
}
