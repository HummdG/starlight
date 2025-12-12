/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a4b8fc',
          400: '#8093f8',
          500: '#6370f1',
          600: '#4f4de5',
          700: '#423dca',
          800: '#3734a3',
          900: '#313381',
          950: '#1e1d4b',
        },
        accent: {
          50: '#fff1f3',
          100: '#ffe0e5',
          200: '#ffc7d0',
          300: '#ff9faf',
          400: '#ff6681',
          500: '#fc3858',
          600: '#ea1541',
          700: '#c50c35',
          800: '#a50d32',
          900: '#8c1031',
          950: '#4e0315',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

