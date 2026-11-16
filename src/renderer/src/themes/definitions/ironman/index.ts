import { CharacterThemeManifest } from '../../types'
import { ironmanInsignias } from './insignias'

export const ironmanTheme: CharacterThemeManifest = {
  id: 'ironman',
  name: 'Iron Man Edition',
  heroName: 'Iron Man',
  category: 'marvel',
  colorDot: '#dc2626',
  colors: {
    primary: '#dc2626',
    onPrimary: '#ffffff',
    secondary: '#eab308',
    onSecondary: '#000000',
    tertiary: '#06b6d4',
    onTertiary: '#083344',
    surface: '#0e0407',
    surfaceDim: '#080204',
    surfaceBright: '#260d13',
    surfaceContainer: '#200c13',
    onSurface: '#fff1f2',
    onSurfaceVariant: '#fda4af',
    outline: 'rgba(234, 179, 8, 0.35)',
    outlineVariant: 'rgba(220, 38, 38, 0.24)',
    borderSubtle: 'rgba(234, 179, 8, 0.16)',
    accentGlow: 'rgba(220, 38, 38, 0.45)',
    chatBgBase: '#0c0306',
    badgeBg: 'rgba(220, 38, 38, 0.20)',
    badgeBorder: '#dc2626',
    badgeText: '#fecaca'
  },
  persona: {
    assistantName: 'Jarvis',
    personaTitle: 'Stark Nanotech Lead Architect',
    personaDescription: 'Sophisticated, high-velocity engineering, and cutting-edge optimizations.',
    systemPromptAddendum:
      'Adopt the sophisticated, witty, and exceptionally refined engineering demeanor of JARVIS / Tony Stark. Focus on high-velocity architecture, cutting-edge telemetry, and microsecond optimizations while remaining an expert software engineer within VersaRail AI.'
  },
  insignias: ironmanInsignias,
  emptyCard: {
    title: 'Stark Industries Armor Subsystems • JARVIS Online',
    description:
      'Holographic HUD telemetry reticles, nanotech carbon-hex mesh, and superheated Arc Reactor plasma bloom.'
  }
}
