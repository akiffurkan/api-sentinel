/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: {
          50: '#1e293b',
          100: '#161e2e',
          200: '#111726',
          300: '#0d131f',
        },
        border: '#1f293d',
        status: {
          up: '#10b981',       // emerald-500
          degraded: '#f59e0b', // amber-500
          down: '#ef4444',     // red-500
          recovered: '#06b6d4',// cyan-500
          pending: '#64748b',  // slate-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
