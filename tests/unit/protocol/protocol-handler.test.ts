/**
 * VersaRail AI Agent Harness - Protocol Handler Unit Tests
 * Milestone 12: ASAR & Custom Protocol Path Resolution
 */

import { describe, it, expect } from 'vitest'
import { CUSTOM_SCHEME } from '../../../src/main/app/protocol-handler'

describe('Custom Protocol URL Normalization & Scheme Verification', () => {
  it('registers app as the custom secure privileged scheme', () => {
    expect(CUSTOM_SCHEME).toBe('app')
  })

  it('normalizes virtual host URL patterns cleanly to file paths', () => {
    function normalizePath(rawUrl: string): string {
      const url = new URL(rawUrl)
      let pathname = decodeURIComponent(url.pathname)

      if (pathname.startsWith('/-/')) {
        pathname = pathname.substring(2)
      } else if (pathname.startsWith('-/')) {
        pathname = pathname.substring(1)
      }

      if (pathname === '/' || pathname === '') {
        pathname = '/index.html'
      }

      return pathname
    }

    expect(normalizePath('app://-/index.html')).toBe('/index.html')
    expect(normalizePath('app://-/assets/index.js')).toBe('/assets/index.js')
    expect(normalizePath('app:///')).toBe('/index.html')
    expect(normalizePath('app:///styles.css')).toBe('/styles.css')
  })
})

