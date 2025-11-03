/**
 * Tailwind CSS Configuration for OSU PAL
 * 
 * This configuration file customizes Tailwind CSS for the OSU PAL application.
 * It extends the default Tailwind theme with:
 * 
 * - Custom CSS variables for consistent theming across light/dark modes
 * - Color system integration with the design tokens defined in globals.css
 * - Content paths for optimal build-time purging of unused styles
 * - Custom border radius values for consistent UI components
 * 
 * The color variables (background, foreground, accent, etc.) are defined
 * in app/globals.css and automatically adapt to the user's preferred color scheme.
 */
import type { Config } from 'tailwindcss';

/** @type {import('tailwindcss').Config} */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        'background-alt': 'var(--background-alt)',
        foreground: 'var(--foreground)',
        'foreground-alt': 'var(--foreground-alt)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
    },
  },
  plugins: [],
};

export default config;