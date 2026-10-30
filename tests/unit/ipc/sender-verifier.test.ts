import { describe, it, expect, beforeEach } from 'vitest'
import { SenderVerifier } from '../../../src/main/ipc/sender-verifier'
import type { IpcMainInvokeEvent, WebFrameMain } from 'electron'

describe('SenderVerifier', () => {
  beforeEach(() => {
    // Register allowed origins
    SenderVerifier.registerAllowedOrigin('app://-')
  })

  it('rejects events with missing senderFrame', () => {
    const mockEvent = {
      senderFrame: null
    } as unknown as IpcMainInvokeEvent

    const result = SenderVerifier.verify(mockEvent, 'test-channel')
    expect(result).toBe(false)
  })

  it('accepts events originating from app:// protocol', () => {
    const mockFrame = {
      url: 'app://-/index.html'
    } as unknown as WebFrameMain

    const mockEvent = {
      senderFrame: mockFrame
    } as unknown as IpcMainInvokeEvent

    const result = SenderVerifier.verify(mockEvent, 'test-channel')
    expect(result).toBe(true)
  })

  it('accepts localhost in development environment', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const mockFrame = {
      url: 'http://localhost:5173/index.html'
    } as unknown as WebFrameMain

    const mockEvent = {
      senderFrame: mockFrame
    } as unknown as IpcMainInvokeEvent

    const result = SenderVerifier.verify(mockEvent, 'test-channel')
    expect(result).toBe(true)

    process.env.NODE_ENV = originalEnv
  })

  it('rejects untrusted remote domains', () => {
    const mockFrame = {
      url: 'https://evil.attacker.com/malicious.html'
    } as unknown as WebFrameMain

    const mockEvent = {
      senderFrame: mockFrame
    } as unknown as IpcMainInvokeEvent

    const result = SenderVerifier.verify(mockEvent, 'test-channel')
    expect(result).toBe(false)
  })
})

