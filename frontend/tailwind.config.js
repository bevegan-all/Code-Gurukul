/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F9FA',
        foreground: '#111827',
        primary: {
          DEFAULT: '#2E86C1',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#AED6F1',
          foreground: '#111827',
        },
        accent: {
          DEFAULT: '#EBF5FB',
          foreground: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
