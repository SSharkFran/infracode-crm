import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0a0a0a',
        surface: '#111111',
        elevated: '#1a1a1a',
        hover: '#202020',
        active: '#252525',
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          subtle: 'rgba(99,102,241,0.12)',
          ring: 'rgba(99,102,241,0.3)',
          text: '#818cf8',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          DEFAULT: 'rgba(255,255,255,0.10)',
          strong: 'rgba(255,255,255,0.18)',
        },
        text: {
          primary: '#f4f4f5',
          secondary: '#a1a1aa',
          tertiary: '#52525b',
        },
        success: {
          DEFAULT: '#22c55e',
          subtle: 'rgba(34,197,94,0.1)',
          text: '#4ade80',
        },
        warning: {
          DEFAULT: '#f59e0b',
          subtle: 'rgba(245,158,11,0.1)',
          text: '#fbbf24',
        },
        danger: {
          DEFAULT: '#ef4444',
          subtle: 'rgba(239,68,68,0.1)',
          text: '#f87171',
        },
        info: {
          DEFAULT: '#3b82f6',
          subtle: 'rgba(59,130,246,0.1)',
          text: '#60a5fa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.4)',
        md: '0 4px 16px rgba(0,0,0,0.5)',
        lg: '0 8px 40px rgba(0,0,0,0.6)',
        glow: '0 0 20px rgba(99,102,241,0.25)',
      },
      borderRadius: {
        card: '16px',
        button: '10px',
        input: '8px',
        badge: '6px',
        pill: '999px',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-out': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(24px)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'toast-in': 'toast-in 180ms ease-out',
        'toast-out': 'toast-out 180ms ease-in forwards',
        'modal-in': 'modal-in 180ms ease-out',
        'fade-in': 'fade-in 180ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
