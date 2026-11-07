import React, { useState, useEffect } from 'react'
import vLogo from '../../assets/glowing-gradient-v-logo.png'

export interface SplashScreenProps {
  durationMs?: number
  onComplete?: () => void
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  durationMs = 1800,
  onComplete
}) => {
  const [phase, setPhase] = useState<'entering' | 'active' | 'exiting' | 'done'>('entering')
  const [statusText, setStatusText] = useState('Initializing VersaRail Engine...')
  const [progress, setProgress] = useState(12)

  useEffect(() => {
    // Phase 1: Entrance trigger
    const enterTimer = setTimeout(() => {
      setPhase('active')
    }, 50)

    // Progress step 1
    const p1Timer = setTimeout(() => {
      setProgress(45)
      setStatusText('Hardening security sandboxes & tools...')
    }, durationMs * 0.3)

    // Progress step 2
    const p2Timer = setTimeout(() => {
      setProgress(85)
      setStatusText('Connecting local agent workstation...')
    }, durationMs * 0.65)

    // Progress step 3 (Ready)
    const p3Timer = setTimeout(() => {
      setProgress(100)
      setStatusText('VersaRail AI Ready')
    }, durationMs * 0.9)

    // Phase 2: Exit fade-out
    const exitTimer = setTimeout(() => {
      setPhase('exiting')
    }, durationMs)

    // Phase 3: Unmount callback
    const doneTimer = setTimeout(() => {
      setPhase('done')
      onComplete?.()
    }, durationMs + 650)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(p1Timer)
      clearTimeout(p2Timer)
      clearTimeout(p3Timer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [durationMs, onComplete])

  if (phase === 'done') return null

  const isExiting = phase === 'exiting'

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#07090e'
      }}
      aria-label="VersaRail AI Loading Screen"
      role="status"
    >
      {/* Frameless Drag Region so window remains draggable during splash */}
      <div className="absolute top-0 left-0 right-0 h-10 drag-region pointer-events-auto" />

      {/* Ambient Multi-Layer Neon Glow Bloom */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[110px] pointer-events-none -translate-x-12 -translate-y-8 opacity-25 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)',
          animationDuration: '3s'
        }}
      />
      <div
        className="absolute w-[460px] h-[460px] rounded-full blur-[100px] pointer-events-none translate-x-16 translate-y-6 opacity-25 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.45) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 70%)',
          animationDuration: '3.5s'
        }}
      />

      {/* Subtle Tech Grid Lines Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Center Logo Showcase */}
      <div className="relative flex flex-col items-center justify-center z-10">
        {/* Glow halo behind logo image */}
        <div
          className="absolute w-56 h-56 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #7e22ce 0%, #0284c7 100%)'
          }}
        />

        {/* Glowing Gradient V Logo Mark */}
        <div className="relative transform transition-transform duration-1000 ease-out hover:scale-105 flex flex-col items-center">
          <img
            src={vLogo}
            alt="VersaRail AI V Mark"
            className="w-56 h-44 sm:w-64 sm:h-48 object-contain drop-shadow-[0_0_35px_rgba(147,51,234,0.35)]"
            style={{
              filter: 'drop-shadow(0 0 25px rgba(126, 34, 206, 0.45)) drop-shadow(0 0 45px rgba(6, 182, 212, 0.35))'
            }}
          />
          {/* Brand Wordmark below the V */}
          <div className="mt-3 flex items-center text-2xl font-bold tracking-tight text-white font-sans">
            <span>VersaRail</span>
            <span className="ml-1.5 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
          </div>
        </div>

        {/* Progress Container */}
        <div className="w-64 sm:w-72 mt-6 flex flex-col items-center gap-2.5">
          {/* Glowing Track Bar */}
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden relative p-[1px] border border-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(56,189,248,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Micro-status & version */}
          <div className="w-full flex items-center justify-between text-[11px] font-mono tracking-wide text-slate-400">
            <span className="truncate pr-2 transition-all duration-300 text-slate-300">
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Tagline */}
      <div className="absolute bottom-6 flex items-center gap-2 text-[10.5px] font-mono tracking-[0.25em] text-slate-500 uppercase">
        <span>Build</span>
        <span className="text-purple-400 text-xs">•</span>
        <span>Orchestrate</span>
        <span className="text-cyan-400 text-xs">•</span>
        <span>Innovate</span>
      </div>
    </div>
  )
}

export default SplashScreen

