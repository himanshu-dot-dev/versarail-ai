import { describe, it, expect } from 'vitest'
import React from 'react'
import { viewRegistry } from '../../../src/renderer/src/app/viewRegistry'

describe('ViewRegistry Architecture', () => {
  it('has all canonical VersaRail views registered in correct order', () => {
    const views = viewRegistry.getAll()
    const viewIds = views.map((v) => v.id)

    expect(viewIds).toContain('chat')
    expect(viewIds).toContain('projects')
    expect(viewIds).toContain('file-explorer')
    expect(viewIds).toContain('ai-providers')
    expect(viewIds).toContain('usage-quotas')
    expect(viewIds).toContain('task-history')
    expect(viewIds).toContain('settings')
  })

  it('retrieves individual view definition with metadata', () => {
    const chatView = viewRegistry.get('chat')
    expect(chatView).toBeDefined()
    expect(chatView?.label).toBe('Chat')
    expect(chatView?.icon).toBe('chat')
    expect(chatView?.hasInspector).toBe(true)
    expect(typeof chatView?.component).toBe('function')
  })

  it('allows registering a new dynamic extension view without altering existing ones', () => {
    const DummyComponent: React.FC = () => null

    viewRegistry.register({
      id: 'custom-extension',
      label: 'Custom Extension',
      icon: 'extension',
      badge: 'PRO',
      component: DummyComponent
    })

    const custom = viewRegistry.get('custom-extension')
    expect(custom).toBeDefined()
    expect(custom?.label).toBe('Custom Extension')
    expect(custom?.badge).toBe('PRO')

    const allViews = viewRegistry.getAll()
    expect(allViews.some((v) => v.id === 'custom-extension')).toBe(true)
  })
})

