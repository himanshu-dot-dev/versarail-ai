import React, { useState, useEffect } from 'react'
import Icon from '../common/Icon'

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (window.electronApi?.isWindowMaximized) {
      window.electronApi.isWindowMaximized().then(setIsMaximized).catch(() => {})
    }
  }, [])

  const handleMinimize = () => {
    window.electronApi?.minimizeWindow?.()
  }

  const handleMaximize = async () => {
    window.electronApi?.maximizeWindow?.()
    if (window.electronApi?.isWindowMaximized) {
      const max = await window.electronApi.isWindowMaximized()
      setIsMaximized(max)
    }
  }

  const handleClose = () => {
    window.electronApi?.closeWindow?.()
  }

  return (
    <header className="h-10 w-full bg-surface-container-low z-50 flex items-center justify-between px-space-lg select-none drag-region border-b border-surface-container-high/60 shrink-0">
      {/* Brand logo & title */}
      <div className="flex items-center gap-space-sm">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary-container to-primary flex items-center justify-center shadow-sm">
          <Icon name="hub" size={13} className="text-on-primary-container" />
        </div>
        <span className="font-headline-sm text-on-surface text-xs font-semibold tracking-wide">
          VersaRail AI
        </span>
        <span className="text-[10px] text-tertiary font-mono px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/30">
          DESKTOP
        </span>
      </div>

      {/* Window Controls (Minimize, Maximize, Close) */}
      <div className="flex items-center gap-1 no-drag-region">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant transition-colors rounded"
          title="Minimize"
          aria-label="Minimize"
        >
          <Icon name="remove" size={14} />
        </button>

        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant transition-colors rounded"
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          <Icon name={isMaximized ? 'filter_none' : 'square'} size={12} />
        </button>

        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center hover:bg-error hover:text-on-error text-on-surface-variant transition-colors rounded"
          title="Close"
          aria-label="Close"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </header>
  )
}

export default TitleBar
