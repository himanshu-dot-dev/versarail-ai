import { SpidermanAtmosphere } from './SpidermanAtmosphere'
import { BatmanAtmosphere } from './BatmanAtmosphere'
import { IronmanAtmosphere } from './IronmanAtmosphere'

export { SpidermanAtmosphere, BatmanAtmosphere, IronmanAtmosphere }

export type AnyThemeAtmosphere = SpidermanAtmosphere | BatmanAtmosphere | IronmanAtmosphere

export function createThemeAtmosphere(themeId: string): AnyThemeAtmosphere | null {
  switch (themeId) {
    case 'spiderman':
      return new SpidermanAtmosphere()
    case 'batman':
      return new BatmanAtmosphere()
    case 'ironman':
      return new IronmanAtmosphere()
    default:
      return null
  }
}
