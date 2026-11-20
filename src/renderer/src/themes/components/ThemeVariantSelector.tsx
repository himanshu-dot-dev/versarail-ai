import React from 'react'
import { themeRegistry } from '../registry'

interface ThemeVariantSelectorProps {
  themeId?: string
  selectedThemeId?: string
  activeVariantId?: string
  selectedVariantId?: string
  onSelectVariant: (variantId: string) => void
  className?: string
}

export const ThemeVariantSelector: React.FC<ThemeVariantSelectorProps> = ({
  themeId,
  selectedThemeId,
  activeVariantId,
  selectedVariantId,
  onSelectVariant,
  className = ''
}) => {
  const resolvedThemeId = themeId || selectedThemeId || ''
  const resolvedVariantId = activeVariantId || selectedVariantId || ''
  const theme = themeRegistry.get(resolvedThemeId)
  if (!theme || !theme.insignias || theme.insignias.length <= 1) {
    return null
  }

  return (
    <div className={`theme-variant-selector flex items-center gap-2 ${className}`}>
      <span className="text-xs text-on-surface-variant font-medium">Insignia Variant:</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {theme.insignias.map((variant) => {
          const isActive =
            variant.id === resolvedVariantId || (!resolvedVariantId && variant.isDefault)
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelectVariant(variant.id)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all duration-200 border ${
                isActive
                  ? 'bg-primary/20 text-on-surface border-primary shadow-[0_0_10px_var(--theme-accent-glow)]'
                  : 'bg-surface-container-high/60 text-on-surface-variant border-outline-variant hover:text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              {variant.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
