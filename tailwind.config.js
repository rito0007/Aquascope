/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { aqua: { 50: '#effaf8', 100: '#d8f2ec', 500: '#198a7e', 700: '#12675f', 900: '#123e3c' } } } },
  plugins: [],
}