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

      {/* Tactile Window Controls Pill (Red Close, Yellow Minimize, Green Maximize) */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-container/70 border border-outline-variant/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-sm no-drag-region">
        {/* Close Button (Red) */}
        <div className="w-[19px] h-[19px] rounded-full bg-black/50 shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center p-[1px]">
          <button
            onClick={handleClose}
            className="w-full h-full rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-110 hover:shadow-[0_0_8px_rgba(255,80,70,0.6)] active:scale-90 active:translate-y-[0.5px]"
            style={{
              background: 'radial-gradient(circle at 50% 28%, #ff6e67 0%, #e0443e 55%, #ab1e19 100%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(0,0,0,0.4)',
              border: '0.5px solid rgba(130, 20, 16, 0.7)'
            }}
            title="Close"
            aria-label="Close"
          >
            <svg width="7" height="7" viewBox="0 0 10 10" fill="none" className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Minimize Button (Yellow) */}
        <div className="w-[19px] h-[19px] rounded-full bg-black/50 shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center p-[1px]">
          <button
            onClick={handleMinimize}
            className="w-full h-full rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-110 hover:shadow-[0_0_8px_rgba(255,189,46,0.6)] active:scale-90 active:translate-y-[0.5px]"
            style={{
              background: 'radial-gradient(circle at 50% 28%, #ffd043 0%, #ffbd2e 55%, #c78608 100%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(0,0,0,0.4)',
              border: '0.5px solid rgba(150, 95, 10, 0.7)'
            }}
            title="Minimize"
            aria-label="Minimize"
          >
            <svg width="7" height="7" viewBox="0 0 10 10" fill="none" className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
              <path d="M2 5H8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Maximize Button (Green) */}
        <div className="w-[19px] h-[19px] rounded-full bg-black/50 shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center p-[1px]">
          <button
            onClick={handleMaximize}
            className="w-full h-full rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-110 hover:shadow-[0_0_8px_rgba(40,200,64,0.6)] active:scale-90 active:translate-y-[0.5px]"
            style={{
              background: 'radial-gradient(circle at 50% 28%, #44d868 0%, #28c840 55%, #188629 100%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(0,0,0,0.4)',
              border: '0.5px solid rgba(16, 110, 32, 0.7)'
            }}
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <svg width="7" height="7" viewBox="0 0 10 10" fill="none" className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
                <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            ) : (
              <svg width="7" height="7" viewBox="0 0 10 10" fill="none" className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
                <path d="M5 2V8M2 5H8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Ribbed Grip Texture (from reference image) */}
        <div className="flex flex-col gap-[2px] ml-1 mr-0.5 opacity-35 select-none" aria-hidden="true">
          <div className="w-2 h-[1.5px] bg-on-surface-variant rounded-full" />
          <div className="w-2 h-[1.5px] bg-on-surface-variant rounded-full" />
          <div className="w-2 h-[1.5px] bg-on-surface-variant rounded-full" />
          <div className="w-2 h-[1.5px] bg-on-surface-variant rounded-full" />
          <div className="w-2 h-[1.5px] bg-on-surface-variant rounded-full" />
        </div>
      </div>
    </header>
  )
}

export default TitleBar
