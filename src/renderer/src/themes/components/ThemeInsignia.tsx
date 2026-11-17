import React, { useMemo } from 'react'
import { themeRegistry } from '../registry'

interface ThemeInsigniaProps {
  themeId: string
  variantId?: string
  mode?: 'avatar' | 'watermark' | 'card'
  size?: number | string
  className?: string
  style?: React.CSSProperties
}

export const ThemeInsignia: React.FC<ThemeInsigniaProps> = ({
  themeId,
  variantId,
  mode = 'avatar',
  size,
  className = '',
  style = {}
}) => {
  const insignia = useMemo(() => {
    return themeRegistry.getInsignia(themeId, variantId)
  }, [themeId, variantId])

  if (!insignia || !insignia.svgContent) {
    return null
  }

  // Derive size based on mode
  const resolvedSize = useMemo(() => {
    if (size) return typeof size === 'number' ? `${size}px` : size
    switch (mode) {
      case 'avatar':
        return '18px'
      case 'watermark':
        return '420px'
      case 'card':
        return '100px'
      default:
        return '24px'
    }
  }, [mode, size])

  // Ensure inline SVG tag explicitly has width and height 100% for scale invariance
  const sanitizedSvg = useMemo(() => {
    let content = insignia.svgContent.trim()
    if (!content.includes('width=') && !content.includes('width =')) {
      content = content.replace('<svg ', '<svg width="100%" height="100%" ')
    }
    return content
  }, [insignia.svgContent])

  return (
    <div
      className={`theme-insignia theme-insignia-${mode} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: resolvedSize,
        height: resolvedSize,
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
    />
  )
}
