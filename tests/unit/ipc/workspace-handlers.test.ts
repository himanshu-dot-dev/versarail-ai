import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IPC_CHANNELS } from '../../../src/shared/events/ipc-channels'
import { SenderVerifier } from '../../../src/main/ipc/sender-verifier'

const { mockHandlers, mockShowOpenDialog, mockBrowserWindow } = vi.hoisted(() => {
  return {
    mockHandlers: new Map<string, (...args: any[]) => Promise<any>>(),
    mockShowOpenDialog: vi.fn(),
    mockBrowserWindow: {
      fromWebContents: vi.fn().mockReturnValue({ id: 1 }),
      getFocusedWindow: vi.fn().mockReturnValue({ id: 1 })
    }
  }
})

vi.mock('electron', () => {
  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: (...args: any[]) => Promise<any>) => {
        mockHandlers.set(channel, handler)
      })
    },
    dialog: {
      showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args)
    },
    BrowserWindow: mockBrowserWindow
  }
})

import { registerWorkspaceHandlers } from '../../../src/main/ipc/handlers/workspace-handlers'

describe('Workspace IPC Handlers', () => {
  beforeEach(() => {
    mockHandlers.clear()
    vi.clearAllMocks()
    SenderVerifier.registerAllowedOrigin('app://-')
    registerWorkspaceHandlers()
  })

  it('registers WORKSPACE_SELECT_FILE and WORKSPACE_SELECT_FOLDER channels', () => {
    expect(mockHandlers.has(IPC_CHANNELS.WORKSPACE_SELECT_FILE)).toBe(true)
    expect(mockHandlers.has(IPC_CHANNELS.WORKSPACE_SELECT_FOLDER)).toBe(true)
    expect(mockHandlers.has(IPC_CHANNELS.WORKSPACE_GET_CURRENT)).toBe(true)
  })

  it('handles multi-file selection via WORKSPACE_SELECT_FILE', async () => {
    mockShowOpenDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: ['C:/project/src/index.ts', 'C:/project/src/App.tsx']
    })

    const handler = mockHandlers.get(IPC_CHANNELS.WORKSPACE_SELECT_FILE)
    expect(handler).toBeDefined()

    const mockEvent = {
      senderFrame: { url: 'app://-/index.html' },
      sender: {}
    }

    const result = await handler!(mockEvent, 'C:/project')
    expect(result).toEqual({
      canceled: false,
      filePaths: ['C:/project/src/index.ts', 'C:/project/src/App.tsx']
    })
    expect(mockShowOpenDialog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'Select File(s) to Attach',
        properties: ['openFile', 'multiSelections']
      })
    )
  })

  it('returns canceled: true when user dismisses file selection', async () => {
    mockShowOpenDialog.mockResolvedValueOnce({
      canceled: true,
      filePaths: []
    })

    const handler = mockHandlers.get(IPC_CHANNELS.WORKSPACE_SELECT_FILE)
    const mockEvent = {
      senderFrame: { url: 'app://-/index.html' },
      sender: {}
    }

    const result = await handler!(mockEvent)
    expect(result).toEqual({
      canceled: true,
      filePaths: []
    })
  })

  it('enforces sender verification security for WORKSPACE_SELECT_FILE', async () => {
    const handler = mockHandlers.get(IPC_CHANNELS.WORKSPACE_SELECT_FILE)
    const mockUntrustedEvent = {
      senderFrame: { url: 'https://evil-untrusted-site.com' },
      sender: {}
    }

    await expect(handler!(mockUntrustedEvent)).rejects.toThrow('Access denied: Unauthorized IPC sender')
  })
})
