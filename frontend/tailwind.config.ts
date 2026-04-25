import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      screens: {
        'tablet':    '768px',
        'laptop':    '1024px',
        'desktop':   '1280px',
        'wide':      '1440px',
        'ultrawide': '1920px',
      },
      colors: {
        ops:  { DEFAULT: '#22c55e', dim: 'rgba(34,197,94,0.12)',   sidebar: '#0d3320' },
        mfg:  { DEFAULT: '#f59e0b', dim: 'rgba(245,158,11,0.12)',  sidebar: '#2d1a00' },
        com:  { DEFAULT: '#60a5fa', dim: 'rgba(96,165,250,0.12)',  sidebar: '#0a1a40' },
        sys:  { DEFAULT: '#a78bfa', dim: 'rgba(167,139,250,0.12)', sidebar: '#1a1640' },
        cfg:  { DEFAULT: '#f472b6', dim: 'rgba(244,114,182,0.12)', sidebar: '#2a0f20' },
        shell:   '#0d0d12',
        surface: '#14141c',
        border:  'rgba(255,255,255,0.07)',
        success: '#22c55e',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#60a5fa',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['11px', { lineHeight: '16px' }],
        sm:    ['12px', { lineHeight: '17px' }],
        base:  ['13px', { lineHeight: '18px' }],
        md:    ['14px', { lineHeight: '20px' }],
        lg:    ['16px', { lineHeight: '22px' }],
        xl:    ['20px', { lineHeight: '26px' }],
        '2xl': ['24px', { lineHeight: '30px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      borderRadius: {
        sm: '4px', DEFAULT: '6px', md: '8px',
        lg: '10px', xl: '14px', '2xl': '18px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
