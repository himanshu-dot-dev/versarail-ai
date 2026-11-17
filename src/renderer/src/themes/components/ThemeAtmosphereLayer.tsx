import React from 'react'
import { ThemeInsignia } from './ThemeInsignia'
import { themeRegistry } from '../registry'

interface ThemeAtmosphereLayerProps {
  themeId: string
  variantId?: string
  opacity?: number
  showWatermark?: boolean
  className?: string
  watermarkSize?: number | string
}

export const ThemeAtmosphereLayer: React.FC<ThemeAtmosphereLayerProps> = ({
  themeId,
  variantId,
  opacity = 0.45,
  showWatermark = true,
  className = '',
  watermarkSize
}) => {
  const isCharacter = themeRegistry.isCharacterTheme(themeId)

  if (!isCharacter) {
    return null
  }

  // Watermark scales directly with the atmosphere opacity setting for high dynamic range
  const watermarkOpacity = Math.min(1, Math.max(0.06, opacity * 0.90))

  return (
    <div
      data-theme={themeId}
      className={`theme-atmosphere-container pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* Layer 1: Procedural Background Pattern (Web, Bats, HUD) */}
      <div
        className="chat-bg-layer-pattern absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: opacity
        }}
      />

      {/* Layer 2: Center Insignia Watermark */}
      {showWatermark && (
        <div
          className="chat-bg-watermark absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 pointer-events-none flex items-center justify-center"
          style={{
            opacity: watermarkOpacity
          }}
        >
          <ThemeInsignia
            themeId={themeId}
            variantId={variantId}
            mode="watermark"
            size={watermarkSize}
          />
        </div>
      )}
    </div>
  )
}
