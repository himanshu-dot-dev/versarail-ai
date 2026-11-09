import { describe, it, expect } from 'vitest'
import { DialogOptions, DialogState } from '../../../src/renderer/src/app/useUiStore'

describe('Custom Confirmation & Alert Dialog System', () => {
  it('correctly models confirm dialog state with danger variant', () => {
    let resolvedValue: boolean | undefined

    const state: DialogState = {
      isOpen: true,
      title: 'Purge Local SQLite Database',
      message: 'Permanently purge local SQLite conversation history? Credentials remain safe.',
      confirmText: 'Purge DB',
      cancelText: 'Cancel',
      variant: 'danger',
      type: 'confirm',
      resolve: (val) => {
        resolvedValue = val
      }
    }

    expect(state.isOpen).toBe(true)
    expect(state.variant).toBe('danger')
    expect(state.type).toBe('confirm')
    expect(state.title).toBe('Purge Local SQLite Database')
    expect(state.message).toContain('SQLite')

    state.resolve?.(true)
    expect(resolvedValue).toBe(true)
  })

  it('correctly models alert dialog state with success variant', () => {
    let resolved = false

    const alertState: DialogState = {
      isOpen: true,
      title: 'Database Purged',
      message: 'Purge complete. Cleaned 5 conversations.',
      confirmText: 'Got it',
      variant: 'success',
      type: 'alert',
      resolve: () => {
        resolved = true
      }
    }

    expect(alertState.isOpen).toBe(true)
    expect(alertState.variant).toBe('success')
    expect(alertState.type).toBe('alert')
    expect(alertState.confirmText).toBe('Got it')

    alertState.resolve?.(true)
    expect(resolved).toBe(true)
  })

  it('handles cancellation and dismissals gracefully', () => {
    let resolvedValue: boolean | undefined

    const confirmState: DialogState = {
      isOpen: true,
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete this chat?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      type: 'confirm',
      resolve: (val) => {
        resolvedValue = val
      }
    }

    confirmState.resolve?.(false)
    expect(resolvedValue).toBe(false)
  })
})

