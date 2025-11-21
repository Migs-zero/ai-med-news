/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        med: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9', // Medical Blue
          600: '#0284c7',
          900: '#0c4a6e',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 啟用排版插件
  ],
};