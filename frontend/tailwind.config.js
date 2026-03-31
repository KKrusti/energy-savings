/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#F59E0B',
        'primary-light': '#FBBF24',
        cta: '#8B5CF6',
        surface: 'rgba(255,255,255,0.06)',
        'surface-hover': 'rgba(255,255,255,0.10)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        glass: '14px',
      },
    },
  },
  plugins: [],
}
