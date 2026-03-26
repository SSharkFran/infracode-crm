import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0f0f0f',
        'app-card': '#1a1a1a',
        'app-card-soft': '#202020',
        'app-accent': '#6366f1',
        'app-border': 'rgba(255, 255, 255, 0.08)',
        'app-success': '#22c55e',
        'app-warning': '#f59e0b',
        'app-danger': '#ef4444',
      },
      boxShadow: {
        panel: '0 24px 80px rgba(0, 0, 0, 0.28)',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
      },
      backgroundImage: {
        hero: 'radial-gradient(circle at top left, rgba(99, 102, 241, 0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.1), transparent 25%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
