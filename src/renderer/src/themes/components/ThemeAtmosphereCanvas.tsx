import React, { useEffect, useRef } from 'react'
import { createThemeAtmosphere, AnyThemeAtmosphere, IronmanAtmosphere } from '../atmospheres'

interface ThemeAtmosphereCanvasProps {
  themeId: string
  opacity?: number
  className?: string
}

export const ThemeAtmosphereCanvas: React.FC<ThemeAtmosphereCanvasProps> = ({
  themeId,
  opacity = 0.45,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const atmosphereRef = useRef<AnyThemeAtmosphere | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const isPausedRef = useRef<boolean>(false)
  const opacityRef = useRef<number>(opacity)
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false
  })

  // Keep opacity ref in sync without triggering full canvas re-initialization
  useEffect(() => {
    opacityRef.current = opacity
  }, [opacity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create the active theme atmosphere renderer
    const atmosphere = createThemeAtmosphere(themeId)
    atmosphereRef.current = atmosphere

    if (!atmosphere) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    let width = 0
    let height = 0

    const updateDimensions = (newWidth: number, newHeight: number) => {
      const w = Math.floor(newWidth)
      const h = Math.floor(newHeight)
      if (w <= 0 || h <= 0) return
      if (w === width && h === height) return

      width = w
      height = h

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (atmosphereRef.current) {
        atmosphereRef.current.init(width, height)
      }
    }

    const measureParent = () => {
      if (!canvas || !canvas.parentElement) return
      const rect = canvas.parentElement.getBoundingClientRect()
      updateDimensions(rect.width, rect.height)
    }

    // Initial measurement
    measureParent()

    // ResizeObserver watches the parent container dynamically (handles view switching, flex layout, sidebar toggling)
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: rw, height: rh } = entry.contentRect
          if (rw > 0 && rh > 0) {
            updateDimensions(rw, rh)
          }
        }
      })
      resizeObserver.observe(canvas.parentElement)
    }

    window.addEventListener('resize', measureParent)

    // Mouse movement listener
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
      mouseRef.current.active = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseleave', handleMouseLeave)

    // Only pause rendering when the document/window is truly hidden (e.g. minimized)
    // NEVER pause on window.blur, as clicking textareas, devtools, or multitasking would freeze the atmosphere
    const handleVisibility = () => {
      isPausedRef.current = document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibility)

    // 45-60 FPS Throttled Render Loop
    let lastTime = performance.now()
    const targetFpsInterval = 1000 / 60

    const renderLoop = (timestamp: number) => {
      animFrameIdRef.current = requestAnimationFrame(renderLoop)

      if (isPausedRef.current || !atmosphereRef.current) {
        return
      }

      // If dimensions were not ready at initial mount, retry measurement
      if (width === 0 || height === 0) {
        measureParent()
        if (width === 0 || height === 0) return
      }

      const elapsed = timestamp - lastTime
      if (elapsed < targetFpsInterval) {
        return
      }
      lastTime = timestamp - (elapsed % targetFpsInterval)

      ctx.clearRect(0, 0, width, height)

      // Update & Render
      atmosphereRef.current.update(width, height, mouseRef.current)

      if (atmosphereRef.current instanceof IronmanAtmosphere) {
        atmosphereRef.current.render(ctx, width, height, opacityRef.current, mouseRef.current)
      } else {
        atmosphereRef.current.render(ctx, width, height, opacityRef.current)
      }
    }

    animFrameIdRef.current = requestAnimationFrame(renderLoop)

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      window.removeEventListener('resize', measureParent)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('visibilitychange', handleVisibility)

      if (atmosphereRef.current) {
        atmosphereRef.current.destroy()
        atmosphereRef.current = null
      }
    }
  }, [themeId])

  return (
    <canvas
      ref={canvasRef}
      className={`theme-atmosphere-canvas absolute inset-0 pointer-events-none select-none transition-opacity duration-200 ${className}`}
      aria-hidden="true"
    />
  )
}
