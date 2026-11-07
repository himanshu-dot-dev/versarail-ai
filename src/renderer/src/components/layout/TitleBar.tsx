import React, { useState, useEffect } from 'react'
import vLogo from '../../assets/glowing-gradient-v-logo.png'

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (window.electronApi?.isWindowMaximized) {
      window.electronApi.isWindowMaximized().then(setIsMaximized).catch(() => { })
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
    <header className="h-10 w-full bg-surface-container-lowest z-50 flex items-center justify-between px-space-lg select-none drag-region border-b border-border-subtle shrink-0">
      {/* Brand logo & title */}
      <div className="flex items-center gap-2">
        <img
          src={vLogo}
          alt="VersaRail AI"
          className="w-5 h-5 object-contain rounded drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
        />
        <span className="font-headline-sm text-on-surface text-xs font-semibold tracking-wide">
          VersaRail AI
        </span>
      </div>

      {/* Window Controls (Windows Order: Minimize, Maximize, Close) */}
      <div className="flex items-center gap-2 no-drag-region">
        {/* Minimize Button (Yellow) */}
        <button
          onClick={handleMinimize}
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-110 active:scale-90 active:translate-y-[0.5px]"
          style={{
            background: 'radial-gradient(circle at 50% 30%, #facc15 0%, #eab308 55%, #ca8a04 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 1px rgba(0,0,0,0.2)'
          }}
          title="Minimize"
          aria-label="Minimize"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="text-white drop-shadow-[0_0.5px_0.5px_rgba(0,0,0,0.5)]">
            <path d="M1.5 5H8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Maximize / Restore Button (Green) */}
        <button
          onClick={handleMaximize}
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-110 active:scale-90 active:translate-y-[0.5px]"
          style={{
            background: 'radial-gradient(circle at 50% 30%, #4ade80 0%, #22c55e 55%, #16a34a 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 1px rgba(0,0,0,0.2)'
          }}
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="text-white drop-shadow-[0_0.5px_0.5px_rgba(0,0,0,0.5)]">
              <rect x="2" y="2" width="6" height="6" rx="0.75" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          ) : (
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="text-white drop-shadow-[0_0.5px_0.5px_rgba(0,0,0,0.5)]">
              <path d="M5 1.5V8.5M1.5 5H8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Close Button (Red) */}
        <button
          onClick={handleClose}
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-110 active:scale-90 active:translate-y-[0.5px]"
          style={{
            background: 'radial-gradient(circle at 50% 30%, #f87171 0%, #ef4444 55%, #dc2626 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 1px rgba(0,0,0,0.2)'
          }}
          title="Close"
          aria-label="Close"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="text-white drop-shadow-[0_0.5px_0.5px_rgba(0,0,0,0.5)]">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default TitleBar
