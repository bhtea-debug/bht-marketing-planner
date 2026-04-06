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
        primary: '#8b6f47',
        'primary-light': '#a88968',
        'primary-dark': '#6b5635',
        secondary: '#d4a574',
        'secondary-light': '#e8c4a0',
        'secondary-dark': '#b8865a',
        accent: '#a67c52',
        'accent-light': '#c9a584',
        'accent-dark': '#8b6540',
        cream: '#faf8f5',
        beige: '#f5f1ea',
        taupe: '#9b9184',
        charcoal: '#3d3d3d',
      },
    },
  },
  plugins: [],
};
