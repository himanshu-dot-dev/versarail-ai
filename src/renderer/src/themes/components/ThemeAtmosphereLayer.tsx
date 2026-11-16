import React from 'react'
import { ThemeInsignia } from './ThemeInsignia'
import { themeRegistry } from '../registry'

interface ThemeAtmosphereLayerProps {
  themeId: string
  variantId?: string
  opacity?: number
  showWatermark?: boolean
  className?: string
}

export const ThemeAtmosphereLayer: React.FC<ThemeAtmosphereLayerProps> = ({
  themeId,
  variantId,
  opacity = 0.45,
  showWatermark = true,
  className = ''
}) => {
  const isCharacter = themeRegistry.isCharacterTheme(themeId)

  if (!isCharacter) {
    return null
  }

  const watermarkOpacity = opacity * 0.45

  return (
    <div
      className={`theme-atmosphere-container pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* Layer 1: Procedural Background Pattern (Web, Bats, HUD) */}
      <div
        className="chat-bg-layer-pattern absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: opacity
        }}
      />

      {/* Layer 2: Center Insignia Watermark */}
      {showWatermark && (
        <div
          className="chat-bg-watermark absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
          style={{
            opacity: watermarkOpacity
          }}
        >
          <ThemeInsignia themeId={themeId} variantId={variantId} mode="watermark" />
        </div>
      )}
    </div>
  )
}
