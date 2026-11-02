import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--color-bg)',
          soft: 'var(--color-bg-soft)',
          muted: 'var(--color-bg-muted)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          soft: 'var(--color-text-soft)',
          muted: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
          bg: 'var(--color-accent-bg)',
        },
        sage: 'var(--color-sage)',
        dusty: 'var(--color-dusty)',
        border: {
          DEFAULT: 'var(--color-border)',
          soft: 'var(--color-border-soft)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        heading: ['var(--font-heading)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        h4: 'var(--text-h4)',
        h3: 'var(--text-h3)',
        h2: 'var(--text-h2)',
        h1: 'var(--text-h1)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
      },
      maxWidth: {
        prose: 'var(--prose-width)',
        page: 'var(--page-width)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        glow: 'var(--shadow-glow)',
        hover: 'var(--shadow-hover)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        base: 'var(--transition-base)',
      },
    },
  },
  plugins: [],
} satisfies Config;
