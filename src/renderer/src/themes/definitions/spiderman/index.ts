import { CharacterThemeManifest } from '../../types'
import { spidermanInsignias } from './insignias'

export const spidermanTheme: CharacterThemeManifest = {
  id: 'spiderman',
  name: 'Spider-Man Edition',
  heroName: 'Spider-Man',
  category: 'marvel',
  colorDot: '#e11d48',
  colors: {
    primary: '#e11d48',
    onPrimary: '#ffffff',
    secondary: '#2563eb',
    onSecondary: '#ffffff',
    tertiary: '#38bdf8',
    onTertiary: '#082f49',
    surface: '#070913',
    surfaceDim: '#05060f',
    surfaceBright: '#161c36',
    surfaceContainer: '#141931',
    onSurface: '#f8fafc',
    onSurfaceVariant: '#94a3b8',
    outline: 'rgba(225, 29, 72, 0.35)',
    outlineVariant: 'rgba(225, 29, 72, 0.20)',
    borderSubtle: 'rgba(37, 99, 235, 0.18)',
    accentGlow: 'rgba(225, 29, 72, 0.45)',
    chatBgBase: '#060814',
    badgeBg: 'rgba(225, 29, 72, 0.20)',
    badgeBorder: '#e11d48',
    badgeText: '#fda4af'
  },
  persona: {
    assistantName: 'Spider-Bot',
    personaTitle: 'Coding Mentor (Spider-Sense)',
    personaDescription: 'Friendly, encouraging, highly attentive to bug traps and edge cases.',
    systemPromptAddendum:
      'Adopt the friendly, witty, and highly vigilant demeanor of Spider-Man (Spider-Bot). Treat edge-cases and security flaws as spider-sense alerts, while remaining an expert software engineer within VersaRail AI.'
  },
  insignias: spidermanInsignias,
  emptyCard: {
    title: 'Spider-Man Edition • Queens Webbing Active',
    description:
      'Radial spider-web geometry & official chest spider watermark. All background effects react to the atmosphere slider.'
  }
}
