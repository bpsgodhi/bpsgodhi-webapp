/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the BPS crest logo.
        // `sky` is remapped to the crest navy so every existing sky-* class
        // across the app becomes on-brand without touching each component.
        sky: {
          50: '#f0f5fc',
          100: '#dde8f6',
          200: '#b9cbe6',
          300: '#86a8d8',
          400: '#5480bf',
          500: '#2b599c',
          600: '#16437f', // primary actions / headers
          700: '#0b2e60', // hover / strong  (≈ logo ring #012E65)
          800: '#08234a',
          900: '#051633',
        },
        // Gold accent — from the crest's sun, stars & "BPS" lettering.
        gold: {
          50: '#fff9e8',
          100: '#fdeec2',
          200: '#fbdd88',
          300: '#f8c94d',
          400: '#f4b301',
          500: '#dd9c00',
          600: '#b47c00',
          700: '#8a5e00',
        },
      },
    },
  },
  plugins: [],
};
