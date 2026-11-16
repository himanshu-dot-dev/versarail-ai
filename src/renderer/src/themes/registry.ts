import { CharacterThemeManifest, ThemeInsigniaDef } from './types'

class ThemeRegistry {
  private themes = new Map<string, CharacterThemeManifest>()

  public register(theme: CharacterThemeManifest): void {
    this.themes.set(theme.id, theme)
  }

  public get(id: string): CharacterThemeManifest {
    return this.themes.get(id) || this.themes.get('versarail-dark')!
  }

  public getAll(): CharacterThemeManifest[] {
    return Array.from(this.themes.values())
  }

  public getByCategory(category: CharacterThemeManifest['category']): CharacterThemeManifest[] {
    return this.getAll().filter((t) => t.category === category)
  }

  public getCharacterThemes(): CharacterThemeManifest[] {
    return this.getAll().filter((t) => t.category !== 'core')
  }

  public isCharacterTheme(id: string): boolean {
    const t = this.themes.get(id)
    return Boolean(t && t.category !== 'core')
  }

  public getDefaultInsignia(themeId: string): ThemeInsigniaDef | undefined {
    const theme = this.get(themeId)
    if (!theme || !theme.insignias || theme.insignias.length === 0) return undefined
    return theme.insignias.find((i) => i.isDefault) || theme.insignias[0]
  }

  public getInsignia(themeId: string, variantId?: string): ThemeInsigniaDef | undefined {
    const theme = this.get(themeId)
    if (!theme || !theme.insignias || theme.insignias.length === 0) return undefined
    if (variantId) {
      const found = theme.insignias.find((i) => i.id === variantId)
      if (found) return found
    }
    return this.getDefaultInsignia(themeId)
  }
}

export const themeRegistry = new ThemeRegistry()
