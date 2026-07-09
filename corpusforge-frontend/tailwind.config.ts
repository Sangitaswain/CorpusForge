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
        // Theme-reactive tokens — actual RGB values come from the CSS custom
        // properties in index.css (:root = light default, html.dark = dark
        // override). The rgb(var(...) / <alpha-value>) form keeps Tailwind's
        // opacity modifiers (e.g. bg-bg-void/80) working.
        'bg-void':     'rgb(var(--color-bg-void) / <alpha-value>)',
        'bg-base':     'rgb(var(--color-bg-base) / <alpha-value>)',
        'bg-surface':  'rgb(var(--color-bg-surface) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        'bg-overlay':  'rgb(var(--color-bg-overlay) / <alpha-value>)',

        'border-subtle':  'rgb(var(--color-border-subtle) / <alpha-value>)',
        'border-default': 'rgb(var(--color-border-default) / <alpha-value>)',
        'border-strong':  'rgb(var(--color-border-strong) / <alpha-value>)',

        'text-primary':   'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-muted':     'rgb(var(--color-text-muted) / <alpha-value>)',
        'text-disabled':  'rgb(var(--color-text-disabled) / <alpha-value>)',

        'accent-teal':         'rgb(var(--color-accent-teal) / <alpha-value>)',
        'accent-teal-dim':     'rgb(var(--color-accent-teal-dim) / <alpha-value>)',
        'accent-teal-bright':  'rgb(var(--color-accent-teal-bright) / <alpha-value>)',
        'accent-teal-wash':    'rgb(var(--color-accent-teal-wash) / <alpha-value>)',
        'accent-orange':       'rgb(var(--color-accent-orange) / <alpha-value>)',
        'accent-orange-bright':'rgb(var(--color-accent-orange-bright) / <alpha-value>)',

        // Node type colours (Knowledge Graph) — fixed across themes by design.
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
