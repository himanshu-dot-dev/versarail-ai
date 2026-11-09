import React, { useEffect, useRef } from 'react'
import { useUiStore } from '../../app/useUiStore'
import Icon from './Icon'
import { soundService } from '../../services/sound-service'

export const CustomDialog: React.FC = () => {
  const { dialogState, closeDialog } = useUiStore()
  const { isOpen, title, message, confirmText, cancelText, variant = 'info', type = 'confirm' } = dialogState
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    soundService.play('alert')

    // Accessibility focus management:
    // For danger confirmations, focus Cancel by default to prevent accidental triggers.
    // For info/alert, focus Confirm by default.
    const timer = setTimeout(() => {
      if (variant === 'danger' && type === 'confirm' && cancelBtnRef.current) {
        cancelBtnRef.current.focus()
      } else if (confirmBtnRef.current) {
        confirmBtnRef.current.focus()
      }
    }, 50)

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog(false)
      } else if (e.key === 'Enter') {
        // If focus is specifically on the cancel button, pressing enter should cancel
        if (document.activeElement === cancelBtnRef.current) {
          e.preventDefault()
          closeDialog(false)
        } else {
          e.preventDefault()
          closeDialog(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, variant, type, closeDialog])

  if (!isOpen) {
    return null
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'delete_forever',
          iconContainer: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
          confirmBtn:
            'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-950/40 border border-rose-500/40'
        }
      case 'warning':
        return {
          icon: 'warning',
          iconContainer: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
          confirmBtn:
            'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-semibold shadow-lg shadow-amber-950/40 border border-amber-400/50'
        }
      case 'success':
        return {
          icon: 'check_circle',
          iconContainer: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
          confirmBtn:
            'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-950/40 border border-emerald-500/40'
        }
      case 'info':
      default:
        return {
          icon: 'info',
          iconContainer: 'bg-primary/15 text-primary border border-primary/30',
          confirmBtn:
            'bg-primary hover:bg-primary/90 active:bg-primary/80 text-on-primary shadow-lg shadow-primary/20 border border-primary/40'
        }
    }
  }

  const styles = getVariantStyles()
  const defaultTitle = type === 'confirm' ? 'Confirm Action' : 'Notice'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={() => closeDialog(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-dialog-title"
    >
      <div
        className="bg-surface-container-high border border-outline-variant/40 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden text-on-surface animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 pt-5 pb-4 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.iconContainer}`}>
              <Icon name={styles.icon} size={20} />
            </div>
            <div>
              <h3 id="custom-dialog-title" className="font-semibold text-sm text-on-surface leading-tight">
                {title || defaultTitle}
              </h3>
              <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">VersaRail AI</p>
            </div>
          </div>

          <button
            onClick={() => closeDialog(false)}
            className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 text-xs text-on-surface leading-relaxed select-text font-sans break-words whitespace-pre-wrap">
          {message}
        </div>

        {/* Action Controls */}
        <div className="px-6 py-4 bg-surface-container-lowest/60 border-t border-outline-variant/20 flex items-center justify-end gap-2.5">
          {type === 'confirm' && (
            <button
              ref={cancelBtnRef}
              onClick={() => closeDialog(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer"
            >
              {cancelText || 'Cancel'}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            onClick={() => closeDialog(true)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${styles.confirmBtn}`}
          >
            {confirmText || (type === 'confirm' ? 'Confirm' : 'Got it')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomDialog

