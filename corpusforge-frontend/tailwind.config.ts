import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
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

        // Interactive — the one signal reserved for anything clickable (Design_System_v1 §6).
        // Token name kept as `accent-teal` for backward compatibility with existing class usage
        // across the codebase; the underlying value is now the instrument-blue, not teal.
        'accent-teal':         'rgb(var(--color-accent-teal) / <alpha-value>)',
        'accent-teal-dim':     'rgb(var(--color-accent-teal-dim) / <alpha-value>)',
        'accent-teal-bright':  'rgb(var(--color-accent-teal-bright) / <alpha-value>)',
        'accent-teal-wash':    'rgb(var(--color-accent-teal-wash) / <alpha-value>)',
        // Warning — token name kept as `accent-orange` for backward compatibility; the
        // underlying value is now the desaturated semantic warning amber, not a decorative orange.
        'accent-orange':       'rgb(var(--color-accent-orange) / <alpha-value>)',
        'accent-orange-bright':'rgb(var(--color-accent-orange-bright) / <alpha-value>)',

        // Semantic — reserved exclusively for critical/warning/success meaning, never branding.
        'critical': 'rgb(var(--color-critical) / <alpha-value>)',
        'warning':  'rgb(var(--color-warning) / <alpha-value>)',
        'success':  'rgb(var(--color-success) / <alpha-value>)',

        // Node type colours (Knowledge Graph) — fixed across themes by design.
        // Revised per Design_System_v1 §6 so no node hue collides with a semantic alert color.
        'node-equipment':  '#3E6FD9',
        'node-incident':   '#C24B87',
        'node-procedure':  '#1D8A8A',
        'node-regulation': '#7A5FC7',
        'node-person':     '#2394B0',
        'node-document':   '#7C838C',
        'node-work-order': '#5D5FCF',
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
      boxShadow: {
        // Matches UI_Design_System.md §5 — light theme only, dark theme uses bg lightness instead.
        'card': '0 1px 3px rgba(15,23,42,0.07), 0 2px 5px rgba(15,23,42,0.05)',
        'elevated': '0 6px 10px rgba(15,23,42,0.08), 0 3px 5px rgba(15,23,42,0.06)',
        'overlay': '0 20px 25px rgba(15,23,42,0.12), 0 10px 10px rgba(15,23,42,0.05)',
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
