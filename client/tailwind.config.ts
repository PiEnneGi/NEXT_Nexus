import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#050505',
          surface: '#0D0D0D',
          border: '#1A1A1A',
          accent: '#FF6B00',
          lime: '#CCFF00',
          danger: '#FF3333',
          success: '#33FF77',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
} satisfies Config
