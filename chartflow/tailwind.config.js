/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",],
  theme: {
    extend: {
      colors: {
        "surface-container-low": "#f3f4f5",
        "surface-container-lowest": "#ffffff",
        "surface-container-highest": "#e1e3e4",
        "surface": "#f8f9fa",
        "on-surface": "#191c1d",
        "on-surface-variant": "#424752",
        "primary": "#00478d",
        "primary-container": "#005eb8",
        "error": "#ba1a1a",
        "tertiary": "#324a5f",
        "tertiary-container": "#4a6278",
      },
      fontFamily: {
        "headline": ["Manrope", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}

