/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8B1A1A',
          light: '#fef2f2',
          50: '#fef2f2',
          100: '#fde8e8',
          200: '#fecaca',
          700: '#991b1b',
          800: '#7a1515',
        },
      },
      fontFamily: {
        sans: [
          'Roboto',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
