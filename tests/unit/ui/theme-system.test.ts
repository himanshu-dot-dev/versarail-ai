import { describe, it, expect } from 'vitest'
import { themeRegistry } from '@renderer/themes'
import { buildAgentSystemPrompt } from '@main/agent/system-prompt'
import {
  AgentAppearanceSettingsSchema,
  DEFAULT_AGENT_APPEARANCE_SETTINGS
} from '@shared/schemas/settings.schema'

describe('Superhero & Custom Theme System', () => {
  describe('ThemeRegistry', () => {
    it('registers all built-in core and superhero themes', () => {
      const all = themeRegistry.getAll()
      expect(all.length).toBeGreaterThanOrEqual(5)

      const ids = all.map((t) => t.id)
      expect(ids).toContain('versarail-dark')
      expect(ids).toContain('light')
      expect(ids).toContain('spiderman')
      expect(ids).toContain('batman')
      expect(ids).toContain('ironman')
    })

    it('identifies character themes vs core themes correctly', () => {
      expect(themeRegistry.isCharacterTheme('spiderman')).toBe(true)
      expect(themeRegistry.isCharacterTheme('batman')).toBe(true)
      expect(themeRegistry.isCharacterTheme('ironman')).toBe(true)
      expect(themeRegistry.isCharacterTheme('versarail-dark')).toBe(false)
      expect(themeRegistry.isCharacterTheme('light')).toBe(false)
    })

    it('resolves default insignias and variants for each hero', () => {
      // Spider-Man
      const spideyDefault = themeRegistry.getDefaultInsignia('spiderman')
      expect(spideyDefault).toBeDefined()
      expect(spideyDefault?.id).toBe('spiderman_chest')

      const spideyMask = themeRegistry.getInsignia('spiderman', 'spiderman_mask')
      expect(spideyMask).toBeDefined()
      expect(spideyMask?.label).toContain('Mask')

      // Batman
      const batDefault = themeRegistry.getDefaultInsignia('batman')
      expect(batDefault).toBeDefined()
      expect(batDefault?.id).toBe('batman_silhouette')

      const batOval = themeRegistry.getInsignia('batman', 'batman_oval')
      expect(batOval).toBeDefined()

      // Iron Man
      const ironDefault = themeRegistry.getDefaultInsignia('ironman')
      expect(ironDefault).toBeDefined()
      expect(ironDefault?.id).toBe('ironman_helmet')

      const arcReactor = themeRegistry.getInsignia('ironman', 'ironman_reactor')
      expect(arcReactor).toBeDefined()

      const avengers = themeRegistry.getInsignia('ironman', 'ironman_avengers')
      expect(avengers).toBeDefined()
    })

    it('allows dynamic registration of future custom character themes (Open-Closed)', () => {
      themeRegistry.register({
        id: 'deadpool',
        name: 'Deadpool Merc Theme',
        category: 'character',
        isDark: true,
        colors: {
          surface: '#0d0204',
          surfaceDim: '#080102',
          surfaceBright: '#24060b',
          surfaceContainerLowest: '#120306',
          surfaceContainerLow: '#170407',
          surfaceContainer: '#1e060a',
          surfaceContainerHigh: '#2a090e',
          surfaceContainerHighest: '#380c13',
          onSurface: '#fff1f2',
          onSurfaceVariant: '#fda4af',
          primary: '#e11d48',
          onPrimary: '#ffffff',
          secondary: '#18181b',
          onSecondary: '#ffffff',
          tertiary: '#f43f5e',
          onTertiary: '#ffffff',
          outline: 'rgba(225, 29, 72, 0.35)',
          outlineVariant: 'rgba(225, 29, 72, 0.20)',
          borderSubtle: 'rgba(225, 29, 72, 0.15)',
          background: '#0d0204',
          onBackground: '#fff1f2'
        },
        persona: {
          codename: 'Merc with a Mouth',
          tagline: 'Maximum effort, maximum code.',
          toneDemeanor: 'Fourth-wall breaking, high octane, fearless.'
        },
        insignias: [
          {
            id: 'deadpool-belt-buckle',
            name: 'Mercenary Split Circle',
            isDefault: true,
            aspectRatio: '1/1',
            viewBox: '0 0 100 100',
            svgContent: '<circle cx="50" cy="50" r="45" fill="#e11d48" />'
          }
        ]
      })

      expect(themeRegistry.isCharacterTheme('deadpool')).toBe(true)
      const deadpool = themeRegistry.get('deadpool')
      expect(deadpool?.persona?.codename).toBe('Merc with a Mouth')
      expect(themeRegistry.getDefaultInsignia('deadpool')?.id).toBe('deadpool-belt-buckle')
    })
  })

  describe('Agent Grounding & Superhero Demeanor Synergy', () => {
    it('always retains foundational VersaRail AI identity in system prompt', () => {
      const prompt = buildAgentSystemPrompt('/test/workspace', {
        agentName: 'Spider-Man',
        userName: 'Peter',
        theme: 'spiderman'
      })

      expect(prompt).toContain('VersaRail AI')
      expect(prompt).toContain('Core Platform & Identity: You are VersaRail AI')
      expect(prompt).toContain('Hero Theme Persona (Spider-Man Mode)')
      expect(prompt).toContain('with great computing power comes great responsibility')
    })

    it('injects Batman tactical demeanor when batman theme is active', () => {
      const prompt = buildAgentSystemPrompt('/test/workspace', {
        theme: 'batman'
      })

      expect(prompt).toContain('VersaRail AI')
      expect(prompt).toContain('Hero Theme Persona (The Dark Knight Mode)')
      expect(prompt).toContain('disciplined, tactical, and vigilant')
    })

    it('injects Iron Man high-tech demeanor when ironman theme is active', () => {
      const prompt = buildAgentSystemPrompt('/test/workspace', {
        theme: 'ironman'
      })

      expect(prompt).toContain('VersaRail AI')
      expect(prompt).toContain('Hero Theme Persona (Tony Stark / Iron Man Mode)')
      expect(prompt).toContain('JARVIS-like telemetry')
    })
  })

  describe('Settings Schema Validation', () => {
    it('validates themeVariant and atmosphereOpacity defaults and boundaries', () => {
      expect(DEFAULT_AGENT_APPEARANCE_SETTINGS.theme).toBe('versarail-dark')
      expect(DEFAULT_AGENT_APPEARANCE_SETTINGS.atmosphereOpacity).toBe(0.45)

      const parsed = AgentAppearanceSettingsSchema.parse({
        theme: 'spiderman',
        themeVariant: 'chest-spider-official',
        atmosphereOpacity: 0.65
      })

      expect(parsed.theme).toBe('spiderman')
      expect(parsed.themeVariant).toBe('chest-spider-official')
      expect(parsed.atmosphereOpacity).toBe(0.65)
    })
  })
})
