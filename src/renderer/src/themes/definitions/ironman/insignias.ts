import { ThemeInsigniaDef } from '../../types'

export const ironmanInsignias: ThemeInsigniaDef[] = [
  {
    id: 'ironman_helmet',
    label: 'Cinematic Mark III Helmet (Default)',
    isDefault: true,
    svgContent: `
      <svg viewBox="0 0 420 540" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 35px rgba(220, 38, 38, 0.85));">
        <defs>
          <linearGradient id="armorCrimson2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#b91c1c" />
            <stop offset="55%" stop-color="#880808" />
            <stop offset="100%" stop-color="#550000" />
          </linearGradient>
          <linearGradient id="crestRed2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#dc2626" />
            <stop offset="100%" stop-color="#700600" />
          </linearGradient>
          <linearGradient id="faceplateGold2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#facc15" />
            <stop offset="25%" stop-color="#eab308" />
            <stop offset="65%" stop-color="#ca8a04" />
            <stop offset="100%" stop-color="#92400e" />
          </linearGradient>
          <linearGradient id="earGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#550000" />
            <stop offset="50%" stop-color="#8a0c0c" />
            <stop offset="100%" stop-color="#3d0000" />
          </linearGradient>
          <filter id="eyeArcBloom2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur1" />
            <feGaussianBlur stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="eyeGlowField2" cx="50%" cy="56%" r="48%">
            <stop offset="0%" stop-color="#00ebff" stop-opacity="0.38" />
            <stop offset="45%" stop-color="#00ebff" stop-opacity="0.14" />
            <stop offset="100%" stop-color="#00ebff" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- 1. BASE OUTLINE / BACKING -->
        <path d="M 44,170 C 14,208 12,278 44,320 L 70,314 L 70,175 Z" fill="#000000" />
        <path d="M 376,170 C 406,208 408,278 376,320 L 350,314 L 350,175 Z" fill="#000000" />
        <path d="
          M 210,10
          C 116,10 54,60 50,185
          C 46,268 50,350 74,416
          L 126,500
          L 154,524
          C 174,538 246,538 266,524
          L 294,500
          L 346,416
          C 370,350 374,268 370,185
          C 366,60 304,10 210,10 Z"
          fill="#000000" />

        <!-- 2. OUTER RED ARMOR -->
        <path d="M 50,178 C 26,212 26,272 50,310 L 68,304 L 68,184 Z" fill="url(#earGrad2)" stroke="#000000" stroke-width="4" />
        <path d="M 370,178 C 394,212 394,272 370,310 L 352,304 L 352,184 Z" fill="url(#earGrad2)" stroke="#000000" stroke-width="4" />
        <path d="
          M 210,18
          C 122,18 64,66 60,185
          C 56,266 60,344 82,410
          L 132,492
          L 156,516
          C 175,528 245,528 264,516
          L 288,492
          L 338,410
          C 360,344 364,266 360,185
          C 356,66 298,18 210,18 Z"
          fill="url(#armorCrimson2)" stroke="#000000" stroke-width="5" />

        <!-- Forehead Stepped Armor Centerpiece -->
        <path d="M 176,14 L 244,14 L 232,126 L 226,185 L 210,214 L 194,185 L 188,126 Z" fill="url(#crestRed2)" stroke="#000000" stroke-width="6" stroke-linejoin="round" />
        <polygon points="185,128 235,128 226,178 210,202 194,178" fill="#600500" stroke="#000000" stroke-width="3" stroke-linejoin="round" />

        <!-- 3. TITANIUM GOLD FACEPLATE -->
        <path d="
          M 176,128
          L 188,126
          L 194,185
          L 210,214
          L 226,185
          L 232,126
          L 244,128
          C 260,114 300,112 334,136
          C 346,148 350,165 350,190
          L 348,268
          L 358,298
          L 348,330
          L 300,458
          L 286,458
          L 280,486
          L 266,494
          L 230,494
          L 226,482
          L 194,482
          L 190,494
          L 154,494
          L 140,486
          L 134,458
          L 120,458
          L 72,330
          L 62,298
          L 72,268
          L 70,190
          C 70,165 74,148 86,136
          C 120,112 160,114 176,128 Z"
          fill="url(#faceplateGold2)" stroke="#000000" stroke-width="7" stroke-linejoin="round" />

        <!-- Temple Gold Flanges -->
        <path d="M 72,190 C 72,165 74,148 86,136 C 120,112 160,114 176,128 L 186,188 L 72,190 Z" fill="#d49e19" stroke="#000000" stroke-width="2" />
        <path d="M 348,190 C 348,165 346,148 334,136 C 300,112 260,114 244,128 L 234,188 L 348,190 Z" fill="#d49e19" stroke="#000000" stroke-width="2" />

        <ellipse cx="210" cy="308" rx="142" ry="86" fill="url(#eyeGlowField2)" />

        <polygon points="72,268 106,288 102,374 72,330" fill="#78350f" opacity="0.45" stroke="#000000" stroke-width="2" />
        <polygon points="348,268 314,288 318,374 348,330" fill="#78350f" opacity="0.45" stroke="#000000" stroke-width="2" />

        <path d="M 88,268 C 130,277 168,288 200,305" stroke="#78350f" stroke-width="3" fill="none" opacity="0.7" />
        <path d="M 332,268 C 290,277 252,288 220,305" stroke="#78350f" stroke-width="3" fill="none" opacity="0.7" />

        <!-- 4. SLANTED ARC CYAN EYE SLITS -->
        <path d="M 86,276 C 122,285 158,295 194,314 C 172,326 132,318 92,298 Z" fill="#000000" stroke="#000000" stroke-width="3" />
        <path d="M 90,279 C 124,287 156,297 190,313 C 170,322 134,314 96,296 Z" fill="#ffffff" stroke="#00ebff" stroke-width="2.5" filter="url(#eyeArcBloom2)" />

        <path d="M 334,276 C 298,285 262,295 226,314 C 248,326 288,318 328,298 Z" fill="#000000" stroke="#000000" stroke-width="3" />
        <path d="M 330,279 C 296,287 264,297 230,313 C 250,322 286,314 324,296 Z" fill="#ffffff" stroke="#00ebff" stroke-width="2.5" filter="url(#eyeArcBloom2)" />

        <!-- 5. MOUTH INTAKE SLIT & CHIN PLATE -->
        <path d="M 142,454 L 278,454 L 284,464 L 274,472 L 146,472 L 136,464 Z" fill="#000000" stroke="#000000" stroke-width="2" />
        <polygon points="146,472 274,472 264,498 210,504 156,498" fill="#b45309" stroke="#000000" stroke-width="3.5" stroke-linejoin="round" />
        <line x1="202" y1="482" x2="202" y2="494" stroke="#000000" stroke-width="3.5" stroke-linecap="round" />
        <line x1="218" y1="482" x2="218" y2="494" stroke="#000000" stroke-width="3.5" stroke-linecap="round" />

        <!-- 6. BOTTOM CRIMSON JAW BEVEL -->
        <path d="M 150,502 L 156,520 C 178,530 242,530 264,520 L 270,502 C 248,510 172,510 150,502 Z" fill="#700600" stroke="#000000" stroke-width="3" />
      </svg>
    `
  },
  {
    id: 'ironman_reactor',
    label: 'Arc Reactor Core',
    svgContent: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" style="filter: drop-shadow(0 0 35px rgba(6, 182, 212, 0.8));">
        <defs>
          <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="arcCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="25%" stop-color="#a6f9ff" />
            <stop offset="65%" stop-color="#00d8f6" />
            <stop offset="100%" stop-color="#051933" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="250" cy="250" r="225" stroke="#dc2626" stroke-width="4" fill="none" opacity="0.6" />
        <circle cx="250" cy="250" r="205" stroke="#eab308" stroke-width="5" stroke-dasharray="14 10" fill="none" />
        <circle cx="250" cy="250" r="185" fill="#18070b" stroke="#374151" stroke-width="4" />

        <circle cx="250" cy="250" r="150" fill="none" stroke="#00e5ff" stroke-width="12" stroke-dasharray="10 5" filter="url(#arcGlow)" />
        <circle cx="250" cy="250" r="125" fill="#0f172a" stroke="#38bdf8" stroke-width="3" />

        <g transform="translate(250,250)" stroke="#eab308" stroke-width="3" fill="#1e293b">
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(36)" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(72)" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(108)" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(144)" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(180)" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(216)" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(252)" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(288)" />
          <path d="M 0,-38 L 32,-85 L -32,-85 Z" transform="rotate(324)" />
        </g>

        <circle cx="250" cy="250" r="85" fill="none" stroke="#7dd3fc" stroke-width="6" filter="url(#arcGlow)" />
        <circle cx="250" cy="250" r="72" fill="url(#arcCoreGlow)" />
        <circle cx="250" cy="250" r="42" fill="none" stroke="#ffffff" stroke-width="3" filter="url(#arcGlow)" />
        <circle cx="250" cy="250" r="22" fill="#ffffff" filter="url(#arcGlow)" />
      </svg>
    `
  },
  {
    id: 'ironman_avengers',
    label: 'Avengers "A" Emblem',
    svgContent: `
      <svg viewBox="0 0 190.764 222.769" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 25px rgba(220, 38, 38, 0.8));">
        <path fill="#dc2626" d="m 91.256,43.595 c -42.332,2.172 -75.995,37.577 -75.995,80.931 0,14.627 3.832,28.349 10.535,40.195 l -8.118,15.765 C 6.548,164.704 0,145.388 0,124.526 0,71.248 42.704,28.053 95.382,28.053 c 0.753,0 1.504,0.009 2.252,0.026 L 111.412,0 h 29.434 v 39.696 c 29.733,16.337 49.918,48.2 49.918,84.829 0,53.279 -42.704,96.473 -95.382,96.473 -16.079,0 -31.229,-4.024 -44.519,-11.132 l 6.712,-13.875 c 11.262,6.107 24.134,9.571 37.807,9.571 44.249,0 80.121,-36.282 80.121,-81.037 0,-27.971 -14.013,-52.633 -35.325,-67.197 v 76.695 L 113.281,108.581 V 50.453 l -33.218,78.891 h 33.218 V 116.68 l 31.141,29.274 -32.179,24.705 V 157.58 H 68.437 L 39.582,222.769 3.874,222.07 91.256,43.595 z"/>
        <polygon points="112.21,179.637 140.125,155.723 140.125,179.637" fill="#facc15"/>
      </svg>
    `
  }
]
