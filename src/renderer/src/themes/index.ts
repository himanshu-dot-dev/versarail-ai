import { themeRegistry } from './registry'
import { versarailDarkTheme } from './definitions/versarail-dark'
import { lightTheme } from './definitions/light'
import { spidermanTheme } from './definitions/spiderman'
import { batmanTheme } from './definitions/batman'
import { ironmanTheme } from './definitions/ironman'

// Register Built-in Core & Character Themes
themeRegistry.register(versarailDarkTheme)
themeRegistry.register(lightTheme)
themeRegistry.register(spidermanTheme)
themeRegistry.register(batmanTheme)
themeRegistry.register(ironmanTheme)

// Public Barrel Exports
export * from './types'
export { themeRegistry }
export { ThemeInsignia } from './components/ThemeInsignia'
export { ThemeAtmosphereLayer } from './components/ThemeAtmosphereLayer'
export { ThemeAtmosphereCanvas } from './components/ThemeAtmosphereCanvas'
export { ThemeVariantSelector } from './components/ThemeVariantSelector'
export * from './atmospheres'
