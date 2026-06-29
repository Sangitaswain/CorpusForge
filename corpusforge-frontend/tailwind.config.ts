import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        'xs':  ['12px', '16px'],
        'sm':  ['13px', '20px'],
        'base':['15px', '22px'],
        'md':  ['16px', '24px'],
        'lg':  ['18px', '28px'],
        'xl':  ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
        'kpi': ['40px', '48px'],
        'hero':['56px', '64px'],
      },
      colors: {
        'bg-void':     '#070E0D',
        'bg-base':     '#0C1715',
        'bg-surface':  '#122220',
        'bg-elevated': '#192F29',
        'bg-overlay':  '#1F3932',

        'border-subtle':  '#1A302A',
        'border-default': '#224038',
        'border-strong':  '#2D5248',

        'text-primary':   '#E8F0EE',
        'text-secondary': '#93ADA8',
        'text-muted':     '#4F7068',
        'text-disabled':  '#2B4A44',

        'accent-teal':         '#14B8A6',
        'accent-teal-dim':     '#0F766E',
        'accent-teal-bright':  '#2DD4BF',
        'accent-orange':       '#EA580C',
        'accent-orange-bright':'#F97316',

        'node-equipment':  '#3B82F6',
        'node-incident':   '#EF4444',
        'node-procedure':  '#10B981',
        'node-regulation': '#8B5CF6',
        'node-person':     '#F59E0B',
        'node-document':   '#6B7280',
        'node-work-order': '#F97316',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
      transitionDuration: {
        'fast': '100ms',
        'base': '150ms',
        'enter': '200ms',
        'slow': '300ms',
      },
      keyframes: {
        'streaming-dot': {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.3' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'streaming-dot': 'streaming-dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
