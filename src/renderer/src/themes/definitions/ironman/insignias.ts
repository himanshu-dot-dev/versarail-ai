import { ThemeInsigniaDef } from '../../types'

export const ironmanInsignias: ThemeInsigniaDef[] = [
  {
    id: 'ironman_helmet',
    label: 'Cinematic Mark III Helmet (Default)',
    isDefault: true,
    svgContent: `
      <svg viewBox="-4 -4 240 348" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 25px rgba(220, 38, 38, 0.85));">
        <!-- 1. BACKDROP CRANIAL SHELL (Stark Crimson) -->
        <path d="M5.63,182.54 C6.8,193.17 6.32,203.46 8.78,213.3 C10.88,221.72 17.21,227.37 20.3,235.04 C22.69,240.99 26.77,245.81 29.61,251.3 C35.21,262.13 56.03,337.71 56.03,337.71 L132.7,337.71 C132.7,337.71 160.7,315.28 173.03,307.66 C182.77,301.64 198.27,283.72 198.27,283.72 C198.27,283.72 206.93,245.86 214.49,229.69 C217.83,222.55 220.44,212.46 222.46,200.9 C222.48,200.78 223.1,200.32 223.26,200.16 C223.68,199.75 223.93,199.47 224.4,198.78 C225,197.91 225.54,196.99 225.94,196.09 C226.21,195.49 226.51,194.76 226.73,194.3 C227.14,193.48 227.61,191.85 227.82,191.18 C228.25,189.77 228.49,189.02 228.65,188.16 C228.68,187.98 230.03,182.59 230.88,176.05 C231.26,173.13 231.53,170 231.68,166.98 C231.75,165.66 231.8,164.4 231.88,163.15 C232.04,160.82 231.98,158.21 231.97,155.88 C231.95,150.73 231.6,145.75 231.12,141.32 C230.12,132.06 228.59,125.32 228.59,125.32 C228.59,125.32 228.65,120.08 228.65,117.65 C228.65,108.52 224.71,97.03 223.83,89.11 C218.87,44.71 207.94,26.15 179.03,14.55 C163.89,8.48 139.33,0 117.79,0 C79.2,0 35.79,21.01 12.54,54.86 C3.9,67.44 4.65,81.6 1.51,97.23 C-2.23,115.87 1.51,136.52 1.51,157.8 C1.51,166.64 4.7,174.09 5.63,182.54 Z" fill="#b91c1c" stroke="#dc2626" stroke-width="2" />
        
        <!-- 2. TITANIUM GOLD FOREHEAD & BROW -->
        <path d="M 36.78,29.17 L 29.43,42.78 L 10.57,58.03 C 4.65,81.6 1.51,97.23 1.51,157.8 L 10.56,169.57 L 26.63,172.73 L 45.41,175.72 L 50.28,179.59 L 94.92,177.24 L 102.08,172.18 L 124.74,165.94 L 145.35,159.09 L 153.53,156.33 L 161.87,167.04 L 169.11,167.78 L 180.93,153.9 L 177.54,106.76 L 179.84,90.75 L 182.61,72.25 L 177.93,46.63 L 165.99,38.69 L 157.5,34.08 L 145.47,29.5 L 124.72,23.3 L 114.52,42.64 L 80.28,39.6 L 52.63,46.56 L 57.05,29.87 L 65.53,11.81 L 50.94,32.02 Z" fill="#facc15" stroke="#78350f" stroke-width="2" />
        
        <!-- 3. CHEEKS & LOWER JAW (WARM GOLD) -->
        <path d="M 2.09,164.82 L 10.56,169.57 L 26.63,172.73 L 45.41,175.72 L 50.28,179.59 L 94.92,177.24 L 102.08,172.18 L 124.74,165.94 L 145.35,159.09 L 153.53,156.33 L 161.87,167.04 L 169.11,167.78 L 194.33,181.23 L 186.17,201.2 L 177.19,213.41 L 163.81,230.37 L 153.01,248.59 L 149.24,262.21 L 148.26,275.68 L 132.12,290.81 L 120.21,280.28 L 49.46,281.89 L 39.48,280.26 L 29.61,251.3 L 20.3,235.04 L 8.78,213.3 L 5.63,182.54 Z" fill="#eab308" stroke="#78350f" stroke-width="2" />
        
        <!-- 4. CHIN BASE PLATE -->
        <polygon points="50.6,318.4 57.7,310.7 72.2,310.1 74,305.3 92.8,304.7 94,310 111.2,310 141,319.3 132.7,337.7 56,337.7" fill="#ca8a04" stroke="#78350f" stroke-width="2" />
        
        <!-- 5. FOREHEAD CENTER ARMOR TAB (Stark Red) -->
        <path d="M52.7,46.2 L49.3,63.3 L47.3,77.5 L45.4,102.2 L69.3,104.4 L94.4,99.6 L102.2,74.4 L107.5,59.2 L114.4,42.8 L80.2,39.6 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2" />
        
        <!-- 6. EAR POD (Concentric Armor Rings) -->
        <ellipse cx="220.3" cy="157.2" rx="11.7" ry="44.4" fill="#7f1d1d" stroke="#f59e0b" stroke-width="2" />
        <ellipse cx="223.6" cy="158.1" rx="8.4" ry="35.7" fill="#facc15" stroke="#78350f" stroke-width="1.5" />
        
        <!-- 7. GLOWING ARC VISOR EYES (WHITE CORE + NEON CYAN RIM) -->
        <path d="M98.65,176.29 C99.12,178.38 100.43,180.06 101.72,181.72 C103.85,182.95 105.05,183.44 106.81,184.16 C110.31,183.87 113.99,183.44 118.94,182.86 C124.22,181.92 125.91,181.88 133.68,181.69 C143.61,177.75 143.61,177.75 162.62,167.94 L154.49,157.41 C135.5,163.85 125.91,166.79 118.42,169.07 C103.25,173.08 103.25,173.08 98.65,176.29 Z" fill="#ffffff" stroke="#00ffff" stroke-width="2.5" />
        <path d="M11.71,170.69 C12.97,181.43 17.44,183.18 25.71,186.41 C49.93,185.63 49.93,185.63 51.32,180.65 L46.33,176.78 L11.71,170.69 Z" fill="#ffffff" stroke="#00ffff" stroke-width="2.5" />
        
        <!-- 8. HIGH-PRECISION COMIC PANEL & BEVEL CONTOURS -->
        <g stroke="#180407" stroke-width="2" fill="none">
          <path d="M174,12.6 L160.6,28.5 L157.3,34 L165.9,38.6 L177.9,46.6 L183.9,51.5 L182.6,72.2 L179.8,90.7 L171.7,138.2 L180.9,153.9 L188.5,111.8 L193.5,92.8 L213,44.3" />
          <path d="M141.2,2.6 L124.8,23.1 L145.4,29.5 L157.5,34" />
          <path d="M29.5,42.6 L50.9,32 L56.9,30 L63.9,14.4 L65.5,11.8" />
          <path d="M60.9,43.6 L53.9,67.9 L48.7,89.2 L45.5,102.1" />
          <path d="M194.3,181.2 L186.1,201.2 L177.1,213.4 L163.8,230.3 L153,248.5 L149.2,262.2 L148.2,275.6 L132.1,290.8 L120.2,280.2 L49.4,281.8 L46.8,290" />
          <path d="M205.1,257 L199.9,237.9 L186.1,201.4 L167.3,243 L151.5,274.8 L149.3,280.1 L132.5,296.5 L115.5,285.9 L55.6,286.3 L51.8,287.9 L49.8,293.8 L39.4,280.2" />
          <path d="M18.5,231.3 L29.6,248.6 L39.6,263.8 L46,276.5 L49.5,282.2" />
        </g>
      </svg>
    `
  },
  {
    id: 'ironman_helmet_straight',
    label: 'Cinematic Mark III Helmet (Straight)',
    svgContent: `
      <svg viewBox="0 0 320 380" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 25px rgba(220, 38, 38, 0.85));">
        <!-- 1. CRIMSON CRANIUM (AERODYNAMIC DOME) -->
        <path d="
          M 160,18
          C 95,18 48,56 38,135
          C 30,195 24,235 24,265
          C 24,288 32,305 42,318
          L 55,318
          L 78,390
          L 115,445
          L 138,456
          L 182,456
          L 205,445
          L 242,390
          L 265,318
          L 278,318
          C 288,305 296,288 296,265
          C 296,235 290,195 282,135
          C 272,56 225,18 160,18 Z"
          transform="scale(0.85) translate(28, 10)"
          fill="#b91c1c" stroke="#dc2626" stroke-width="2.5" />

        <!-- Forehead Center Red Plate (Stepped Crest arched backward) -->
        <path d="
          M 132,32
          L 188,32
          L 182,126
          L 160,146
          L 138,126 Z"
          fill="#dc2626" stroke="#7f1d1d" stroke-width="2.5" />

        <!-- Ear Pods (Slim cylindrical pods with gold rivets) -->
        <ellipse cx="44" cy="235" rx="7" ry="32" fill="#7f1d1d" stroke="#f59e0b" stroke-width="1.8" />
        <ellipse cx="276" cy="235" rx="7" ry="32" fill="#7f1d1d" stroke="#f59e0b" stroke-width="1.8" />
        <circle cx="44" cy="235" r="3.5" fill="#facc15" />
        <circle cx="276" cy="235" r="3.5" fill="#facc15" />

        <!-- 2. TITANIUM GOLD FACEPLATE (STREAMLINED V-TAPER) -->
        <path d="
          M 138,126
          L 160,146
          L 182,126
          L 228,94
          C 255,106 270,128 272,165
          L 266,235
          L 272,268
          L 242,370
          L 225,370
          L 216,408
          L 196,418
          L 124,418
          L 104,408
          L 95,370
          L 78,370
          L 48,268
          L 54,235
          L 48,165
          C 50,128 65,106 92,94
          Z"
          transform="scale(0.85) translate(28, 10)"
          fill="#facc15" stroke="#78350f" stroke-width="3" stroke-linejoin="round" />

        <!-- Cheekbone Shading (Warm gold) -->
        <path d="
          M 70,150
          L 98,172
          L 92,238
          L 64,238 Z
          M 250,150
          L 222,172
          L 228,238
          L 256,238 Z"
          fill="#eab308" opacity="0.75" />

        <!-- Brow Ridge Indentations -->
        <path d="M 75,190 L 140,205 M 245,190 L 180,205" stroke="#854d0e" stroke-width="3.5" stroke-linecap="round" />

        <!-- 3. GLOWING ARC VISOR EYES (SLANTED SLEEK CYAN) -->
        <!-- Left Eye -->
        <polygon points="85,212 138,223 134,238 92,233" fill="#ffffff" stroke="#00ffff" stroke-width="3" stroke-linejoin="round" />
        <line x1="94" y1="222" x2="132" y2="230" stroke="#38bdf8" stroke-width="1.8" />

        <!-- Right Eye -->
        <polygon points="235,212 182,223 186,238 228,233" fill="#ffffff" stroke="#00ffff" stroke-width="3" stroke-linejoin="round" />
        <line x1="226" y1="222" x2="188" y2="230" stroke="#38bdf8" stroke-width="1.8" />

        <!-- 4. AERODYNAMIC MOUTH INTAKE VENT -->
        <polygon points="120,314 200,314 195,322 125,322" fill="#180407" stroke="#000000" stroke-width="1.8" />
        <line x1="128" y1="318" x2="192" y2="318" stroke="#854d0e" stroke-width="1.8" />

        <!-- 5. CHIN PLATE & VERTICAL GROOVES -->
        <polygon points="130,330 190,330 182,358 138,358" fill="#eab308" stroke="#854d0e" stroke-width="2" stroke-linejoin="round" />
        <line x1="154" y1="336" x2="154" y2="352" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
        <line x1="166" y1="336" x2="166" y2="352" stroke="#78350f" stroke-width="2" stroke-linecap="round" />

        <!-- 6. BOTTOM CRIMSON JAW BEVEL -->
        <path d="M 124,364 L 138,376 L 182,376 L 196,364 Z" fill="#991b1b" stroke="#7f1d1d" stroke-width="2" />
      </svg>
    `
  },
  {
    id: 'ironman_reactor',
    label: 'Arc Reactor Core',
    svgContent: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" style="filter: drop-shadow(0 0 35px rgba(6, 182, 212, 0.85));">
        <circle cx="250" cy="250" r="225" stroke="#dc2626" stroke-width="4" fill="none" opacity="0.6" />
        <circle cx="250" cy="250" r="205" stroke="#eab308" stroke-width="5" stroke-dasharray="14 10" fill="none" />
        <circle cx="250" cy="250" r="185" fill="#18070b" stroke="#374151" stroke-width="4" />

        <circle cx="250" cy="250" r="150" fill="none" stroke="#00e5ff" stroke-width="12" stroke-dasharray="10 5" style="filter: drop-shadow(0 0 8px #00e5ff);" />
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

        <circle cx="250" cy="250" r="85" fill="none" stroke="#7dd3fc" stroke-width="6" style="filter: drop-shadow(0 0 6px #7dd3fc);" />
        <circle cx="250" cy="250" r="68" fill="#00d8f6" opacity="0.3" />
        <circle cx="250" cy="250" r="48" fill="#38bdf8" opacity="0.6" />
        <circle cx="250" cy="250" r="28" fill="#ffffff" style="filter: drop-shadow(0 0 10px #ffffff);" />
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

