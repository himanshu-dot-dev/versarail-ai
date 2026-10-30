import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import { join } from 'path'

export const CUSTOM_SCHEME = 'app'

export function registerCustomProtocol(): void {
  // Register 'app' as a standard and secure scheme
  protocol.registerSchemesAsPrivileged([
    {
      scheme: CUSTOM_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: false,
        supportFetchAPI: true,
        corsEnabled: false
      }
    }
  ])
}

export function setupProtocolHandler(rendererDistPath: string): void {
  protocol.handle(CUSTOM_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      // Normalize pathname
      let pathname = decodeURIComponent(url.pathname)

      if (pathname === '/' || pathname === '') {
        pathname = '/index.html'
      }

      const filePath = join(rendererDistPath, pathname)
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (err) {
      console.error('[Protocol Handler] Error resolving asset:', err)
      return new Response('Not found', { status: 404 })
    }
  })
}

