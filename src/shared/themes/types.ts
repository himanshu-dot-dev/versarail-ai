/**
 * VersaRail AI - Universal Superhero & Character Theme Contracts
 */

export type ThemeId =
  | 'versarail-dark'
  | 'light'
  | 'system'
  | 'spiderman'
  | 'batman'
  | 'ironman'
  | (string & {}) // Allows any future custom character theme

export interface ThemeColorTokens {
  primary: string
  onPrimary: string
  secondary: string
  onSecondary: string
  tertiary: string
  onTertiary: string
  surface: string
  surfaceDim: string
  surfaceBright: string
  surfaceContainer: string
  surfaceContainerLowest?: string
  surfaceContainerHighest?: string
  onSurface: string
  onSurfaceVariant: string
  outline: string
  outlineVariant: string
  borderSubtle: string
  accentGlow: string
  chatBgBase: string
  badgeBg: string
  badgeBorder: string
  badgeText: string
}

export interface ThemeInsigniaDef {
  id: string
  label: string
  svgContent: string
  isDefault?: boolean
}

export interface ThemePersonaDef {
  assistantName: string
  personaTitle: string
  personaDescription: string
  systemPromptAddendum: string
  codename?: string
  tagline?: string
}

export interface ThemeAtmosphereRenderer {
  render: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opacity: number,
    timestamp: number
  ) => void
  init?: (width: number, height: number) => void
  destroy?: () => void
}

export interface CharacterThemeManifest {
  id: ThemeId
  name: string
  heroName?: string
  category: 'core' | 'marvel' | 'dc' | 'custom'
  colorDot: string
  colors: ThemeColorTokens
  persona: ThemePersonaDef
  insignias: ThemeInsigniaDef[]
  atmosphere?: ThemeAtmosphereRenderer
  emptyCard: {
    title: string
    description: string
  }
}
