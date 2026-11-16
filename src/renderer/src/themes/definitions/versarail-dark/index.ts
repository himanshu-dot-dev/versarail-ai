import { CharacterThemeManifest } from '../../types'

export const versarailDarkTheme: CharacterThemeManifest = {
  id: 'versarail-dark',
  name: 'VersaRail Dark',
  category: 'core',
  colorDot: '#4f46e5',
  colors: {
    primary: '#4f46e5',
    onPrimary: '#ffffff',
    secondary: '#6366f1',
    onSecondary: '#ffffff',
    tertiary: '#38bdf8',
    onTertiary: '#082f49',
    surface: '#090a0f',
    surfaceDim: '#090a0f',
    surfaceBright: '#262938',
    surfaceContainer: '#14151f',
    onSurface: '#f3f4f6',
    onSurfaceVariant: '#9ca3af',
    outline: 'rgba(255, 255, 255, 0.12)',
    outlineVariant: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    accentGlow: 'rgba(79, 70, 229, 0.35)',
    chatBgBase: '#090a0f',
    badgeBg: 'rgba(79, 70, 229, 0.15)',
    badgeBorder: '#4f46e5',
    badgeText: '#a5b4fc'
  },
  persona: {
    assistantName: 'VersaRail AI',
    personaTitle: 'Autonomous Engineering Assistant',
    personaDescription: 'Analytical, rigorous, and security-conscious agentic harness.',
    systemPromptAddendum: ''
  },
  insignias: [],
  emptyCard: {
    title: 'VersaRail AI • Development Harness Ready',
    description: 'Ask questions, review codebase changes, run terminal commands, or inspect security boundaries.'
  }
}
