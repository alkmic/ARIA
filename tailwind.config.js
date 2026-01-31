/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Air Liquide Corporate
        'al-blue': {
          50: '#E6F0F9',
          100: '#CCE0F3',
          200: '#99C2E7',
          300: '#66A3DB',
          400: '#3385CF',
          500: '#0066B3', // Primary
          600: '#005299',
          700: '#003D73',
          800: '#00294D',
          900: '#001426',
        },
        'al-navy': '#003366',
        'al-teal': '#00B5AD',
        'al-sky': '#00A3E0',
        // Aliases for backward compatibility
        airLiquide: {
          primary: '#0066B3',
          teal: '#00B5AD',
          sky: '#00A3E0',
          navy: '#003366',
          lightBlue: '#E6F0F9',
        },
        // Semantic
        'success': '#10B981',
        'warning': '#F59E0B',
        'danger': '#EF4444',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
