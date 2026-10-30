/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Semantic VersaRail Theme Tokens mapped to CSS variables for dynamic theming
        'surface': 'var(--color-surface, #13131b)',
        'surface-dim': 'var(--color-surface-dim, #13131b)',
        'surface-bright': 'var(--color-surface-bright, #393841)',
        'surface-container-lowest': 'var(--color-surface-container-lowest, #0d0d15)',
        'surface-container-low': 'var(--color-surface-container-low, #1b1b23)',
        'surface-container': 'var(--color-surface-container, #1f1f27)',
        'surface-container-high': 'var(--color-surface-container-high, #292932)',
        'surface-container-highest': 'var(--color-surface-container-highest, #34343d)',
        
        'on-surface': 'var(--color-on-surface, #e4e1ed)',
        'on-surface-variant': 'var(--color-on-surface-variant, #c7c4d7)',
        'inverse-surface': 'var(--color-inverse-surface, #e4e1ed)',
        'inverse-on-surface': 'var(--color-inverse-on-surface, #303038)',
        
        'outline': 'var(--color-outline, #908fa0)',
        'outline-variant': 'var(--color-outline-variant, #464554)',
        'border-subtle': 'var(--color-border-subtle, #212631)',

        'primary': 'var(--color-primary, #c0c1ff)',
        'on-primary': 'var(--color-on-primary, #1000a9)',
        'primary-container': 'var(--color-primary-container, #8083ff)',
        'on-primary-container': 'var(--color-on-primary-container, #0d0096)',
        'inverse-primary': 'var(--color-inverse-primary, #494bd6)',

        'secondary': 'var(--color-secondary, #bdc2ff)',
        'on-secondary': 'var(--color-on-secondary, #131e8c)',
        'secondary-container': 'var(--color-secondary-container, #2f3aa3)',
        'on-secondary-container': 'var(--color-on-secondary-container, #a8afff)',

        'tertiary': 'var(--color-tertiary, #4cd7f6)',
        'on-tertiary': 'var(--color-on-tertiary, #003640)',
        'tertiary-container': 'var(--color-tertiary-container, #009eb9)',
        'on-tertiary-container': 'var(--color-on-tertiary-container, #002f38)',

        'error': 'var(--color-error, #ffb4ab)',
        'on-error': 'var(--color-on-error, #690005)',
        'error-container': 'var(--color-error-container, #93000a)',
        'on-error-container': 'var(--color-on-error-container, #ffdad6)',

        'background': 'var(--color-background, #13131b)',
        'on-background': 'var(--color-on-background, #e4e1ed)'
      },
      spacing: {
        'space-xs': '0.25rem',  // 4px
        'space-sm': '0.5rem',   // 8px
        'space-md': '0.75rem',  // 12px
        'space-lg': '1rem',     // 16px
        'space-xl': '1.5rem',   // 24px
        'gutter': '1rem',       // 16px
        'margin': '1.5rem'      // 24px
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Courier New', 'monospace']
      },
      fontSize: {
        'headline-xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['18px', { lineHeight: '24px', fontWeight: '500' }],
        'headline-sm': ['15px', { lineHeight: '20px', fontWeight: '500' }],
        'body-lg': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-md': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '500' }]
      },
      borderRadius: {
        DEFAULT: '0.25rem', // 4px
        sm: '0.125rem',     // 2px
        md: '0.375rem',     // 6px
        lg: '0.5rem',       // 8px
        xl: '0.75rem',      // 12px
        '2xl': '1rem',      // 16px
        full: '9999px'
      }
    }
  },
  plugins: []
}

