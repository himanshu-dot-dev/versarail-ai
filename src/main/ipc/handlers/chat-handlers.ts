import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/events/ipc-channels'
import { SenderVerifier } from '../sender-verifier'
import { ConversationStore } from '../../storage/conversation-store'
import { AgentRuntime } from '../../agent/agent-runtime'
import { ProviderId } from '@shared/domain/models'

export function registerChatHandlers(): void {
  const convStore = ConversationStore.getInstance()
  const agentRuntime = AgentRuntime.getInstance()

  // 1. List Conversations
  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_LIST, async (event: IpcMainInvokeEvent) => {
    if (!SenderVerifier.verify(event, IPC_CHANNELS.CONVERSATIONS_LIST)) {
      throw new Error('Access denied: Unauthorized IPC sender')
    }
    return convStore.listConversations()
  })

  // 2. Get Conversation & History
  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_GET, async (event: IpcMainInvokeEvent, conversationId: string) => {
    if (!SenderVerifier.verify(event, IPC_CHANNELS.CONVERSATIONS_GET)) {
      throw new Error('Access denied: Unauthorized IPC sender')
    }
    return convStore.getConversation(conversationId)
  })

  // 3. Delete Conversation
  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_DELETE, async (event: IpcMainInvokeEvent, conversationId: string) => {
    if (!SenderVerifier.verify(event, IPC_CHANNELS.CONVERSATIONS_DELETE)) {
      throw new Error('Access denied: Unauthorized IPC sender')
    }
    return convStore.deleteConversation(conversationId)
  })

  // 4. Rename Conversation
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATIONS_RENAME,
    async (event: IpcMainInvokeEvent, payload: { conversationId: string; title: string }) => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.CONVERSATIONS_RENAME)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }
      return convStore.renameConversation(payload.conversationId, payload.title)
    }
  )

  // 5. Send Prompt (Starts Streaming Loop)
  ipcMain.handle(
    IPC_CHANNELS.AGENT_SEND_PROMPT,
    async (
      event: IpcMainInvokeEvent,
      payload: {
        conversationId: string
        prompt: string
        modelId: string
        providerId: string
        workspacePath?: string | null
      }
    ) => {
      if (!SenderVerifier.verify(event, IPC_CHANNELS.AGENT_SEND_PROMPT)) {
        throw new Error('Access denied: Unauthorized IPC sender')
      }

      const senderWebContents = event.sender

      // Launch async stream and stream tokens to client
      try {
        const result = await agentRuntime.executePrompt({
          conversationId: payload.conversationId,
          prompt: payload.prompt,
          modelId: payload.modelId,
          providerId: payload.providerId as ProviderId,
          workspacePath: payload.workspacePath,
          onToken: (chunk) => {
            if (!senderWebContents.isDestroyed()) {
              senderWebContents.send(IPC_CHANNELS.AGENT_STREAM_TOKEN, chunk)
            }
          },
          onFailover: (failoverEvent) => {
            if (!senderWebContents.isDestroyed()) {
              senderWebContents.send(IPC_CHANNELS.AGENT_FAILOVER, failoverEvent)
            }
          },
          onError: (err) => {
            if (!senderWebContents.isDestroyed()) {
              senderWebContents.send(IPC_CHANNELS.AGENT_STREAM_TOKEN, {
                runId: err.runId,
                delta: '',
                isComplete: true,
                error: err.message
              })
            }
          }
        })

        return { success: true, runId: result.runId }
      } catch (err: any) {
        return { success: false, error: err.message || 'Prompt execution failed' }
      }
    }
  )

  // 5. Cancel Run
  ipcMain.handle(IPC_CHANNELS.AGENT_CANCEL_RUN, async (event: IpcMainInvokeEvent, runId: string) => {
    if (!SenderVerifier.verify(event, IPC_CHANNELS.AGENT_CANCEL_RUN)) {
      throw new Error('Access denied: Unauthorized IPC sender')
    }
    const cancelled = agentRuntime.cancelRun(runId)
    return { success: cancelled }
  })
}
