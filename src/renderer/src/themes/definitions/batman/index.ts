import { CharacterThemeManifest } from '../../types'
import { batmanInsignias } from './insignias'

export const batmanTheme: CharacterThemeManifest = {
  id: 'batman',
  name: 'Batman Edition',
  heroName: 'Batman',
  category: 'dc',
  colorDot: '#f59e0b',
  colors: {
    primary: '#f59e0b',
    onPrimary: '#000000',
    secondary: '#64748b',
    onSecondary: '#ffffff',
    tertiary: '#eab308',
    onTertiary: '#000000',
    surface: '#050608',
    surfaceDim: '#030405',
    surfaceBright: '#171822',
    surfaceContainer: '#11131b',
    onSurface: '#f1f5f9',
    onSurfaceVariant: '#94a3b8',
    outline: 'rgba(245, 158, 11, 0.32)',
    outlineVariant: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(245, 158, 11, 0.14)',
    accentGlow: 'rgba(245, 158, 11, 0.42)',
    chatBgBase: '#040507',
    badgeBg: 'rgba(245, 158, 11, 0.18)',
    badgeBorder: '#f59e0b',
    badgeText: '#fde68a'
  },
  persona: {
    assistantName: 'Batcomputer',
    personaTitle: 'Security Auditor (Gotham Stealth)',
    personaDescription: 'Tactical, paranoid path boundary scrutiny, and zero-trust permissions.',
    systemPromptAddendum:
      'Adopt the tactical, vigilant, and zero-trust posture of the Batcomputer. Rigorously scrutinize path traversals, verify file modifications, and deliver concise, authoritative intelligence while remaining an expert software engineer within VersaRail AI.'
  },
  insignias: batmanInsignias,
  emptyCard: {
    title: 'WayneTech Tactical Mainframe • Gotham Stealth Active',
    description:
      'Bat-Signal spotlight beam & authentic bat swarm dispersal. Shadow vignette deepens in tactical mode.'
  }
}
