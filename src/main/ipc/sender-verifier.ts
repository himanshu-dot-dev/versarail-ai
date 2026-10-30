import { IpcMainInvokeEvent, WebFrameMain } from 'electron'

export class SenderVerifier {
  private static allowedOrigins = new Set<string>()

  public static registerAllowedOrigin(origin: string): void {
    this.allowedOrigins.add(origin)
  }

  public static verify(event: IpcMainInvokeEvent, channelName: string): boolean {
    const frame: WebFrameMain | null = event.senderFrame

    if (!frame) {
      console.error(`[Security] IPC rejected: No sender frame found for channel ${channelName}`)
      return false
    }

    // In packaged production, strictly enforce custom protocol origin
    // In local development, permit Vite development server on loopback
    const frameUrl = frame.url

    try {
      const parsed = new URL(frameUrl)
      const origin = parsed.origin

      // Check against registered allowed origins
      if (this.allowedOrigins.has(origin) || frameUrl.startsWith('app://')) {
        return true
      }

      // Development loopback check
      if (process.env.NODE_ENV !== 'production' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        return true
      }

      console.error(
        `[Security Violation] Untrusted IPC sender origin: ${origin} (URL: ${frameUrl}) on channel: ${channelName}`
      )
      return false
    } catch (err) {
      console.error(`[Security Violation] Failed to parse sender URL: ${frameUrl} on channel: ${channelName}`, err)
      return false
    }
  }
}

