import { CharacterThemeManifest } from '../../types'

export const lightTheme: CharacterThemeManifest = {
  id: 'light',
  name: 'Executive Light',
  category: 'core',
  colorDot: '#ffffff',
  colors: {
    primary: '#4f46e5',
    onPrimary: '#ffffff',
    secondary: '#6366f1',
    onSecondary: '#ffffff',
    tertiary: '#0284c7',
    onTertiary: '#ffffff',
    surface: '#f8fafc',
    surfaceDim: '#f1f5f9',
    surfaceBright: '#ffffff',
    surfaceContainer: '#ffffff',
    onSurface: '#0f172a',
    onSurfaceVariant: '#475569',
    outline: '#94a3b8',
    outlineVariant: 'rgba(0, 0, 0, 0.08)',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
    accentGlow: 'rgba(79, 70, 229, 0.20)',
    chatBgBase: '#f8fafc',
    badgeBg: 'rgba(79, 70, 229, 0.10)',
    badgeBorder: '#4f46e5',
    badgeText: '#4338ca'
  },
  persona: {
    assistantName: 'VersaRail AI',
    personaTitle: 'Executive Analyst',
    personaDescription: 'High-contrast light mode tailored for daytime work environments.',
    systemPromptAddendum: ''
  },
  insignias: [],
  emptyCard: {
    title: 'Executive Mode • Daytime Workspace Active',
    description: 'Clean high-contrast productivity interface with full provider telemetry.'
  }
}
