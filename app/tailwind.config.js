/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: '#0a0a0f',
          card: '#12121a',
          cardHover: '#181825',
          border: '#1e1e2e',
          text: '#e4e4ef',
          dim: '#8888a0',
          deep: '#0d0d18',
        },
        gold: {
          DEFAULT: '#fbbf24',
          bright: '#fde047',
          deep: '#d97706',
          amber: '#f59e0b',
        },
        'purple-glow': '#7c3aed',
        'purple-bright': '#c084fc',
      },
      fontFamily: {
        display: ['Unbounded', 'sans-serif'],
        body: ['Onest', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'gold-sm': '0 4px 16px rgba(251,191,36,0.15)',
        'gold-lg': '0 12px 40px rgba(251,191,36,0.2)',
        'purple-glow': '0 30px 80px rgba(124,58,237,0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease both',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.7)' },
        },
      },
    },
  },
  plugins: [],
};
