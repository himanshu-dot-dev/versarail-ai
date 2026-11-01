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
        'surface': 'var(--color-surface, #090a0f)',
        'surface-dim': 'var(--color-surface-dim, #090a0f)',
        'surface-bright': 'var(--color-surface-bright, #262938)',
        'surface-container-lowest': 'var(--color-surface-container-lowest, #0d0e14)',
        'surface-container-low': 'var(--color-surface-container-low, #10121a)',
        'surface-container': 'var(--color-surface-container, #14151f)',
        'surface-container-high': 'var(--color-surface-container-high, #1a1c29)',
        'surface-container-highest': 'var(--color-surface-container-highest, #222536)',
        
        'on-surface': 'var(--color-on-surface, #f3f4f6)',
        'on-surface-variant': 'var(--color-on-surface-variant, #9ca3af)',
        'inverse-surface': 'var(--color-inverse-surface, #f3f4f6)',
        'inverse-on-surface': 'var(--color-inverse-on-surface, #1e1e28)',
        
        'outline': 'var(--color-outline, rgba(255, 255, 255, 0.12))',
        'outline-variant': 'var(--color-outline-variant, rgba(255, 255, 255, 0.08))',
        'border-subtle': 'var(--color-border-subtle, rgba(255, 255, 255, 0.06))',

        'primary': 'var(--color-primary, #4f46e5)',
        'on-primary': 'var(--color-on-primary, #ffffff)',
        'primary-container': 'var(--color-primary-container, #6366f1)',
        'on-primary-container': 'var(--color-on-primary-container, #ffffff)',
        'inverse-primary': 'var(--color-inverse-primary, #818cf8)',

        'secondary': 'var(--color-secondary, #6366f1)',
        'on-secondary': 'var(--color-on-secondary, #ffffff)',
        'secondary-container': 'var(--color-secondary-container, rgba(99, 102, 241, 0.15))',
        'on-secondary-container': 'var(--color-on-secondary-container, #c7d2fe)',

        'tertiary': 'var(--color-tertiary, #38bdf8)',
        'on-tertiary': 'var(--color-on-tertiary, #082f49)',
        'tertiary-container': 'var(--color-tertiary-container, rgba(56, 189, 248, 0.15))',
        'on-tertiary-container': 'var(--color-on-tertiary-container, #bae6fd)',

        'error': 'var(--color-error, #f87171)',
        'on-error': 'var(--color-on-error, #ffffff)',
        'error-container': 'var(--color-error-container, rgba(239, 68, 68, 0.15))',
        'on-error-container': 'var(--color-on-error-container, #fca5a5)',

        'background': 'var(--color-background, #090a0f)',
        'on-background': 'var(--color-on-background, #f3f4f6)'
      },
      borderColor: {
        DEFAULT: 'var(--color-border-subtle, rgba(255, 255, 255, 0.06))'
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
