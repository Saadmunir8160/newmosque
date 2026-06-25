/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        mosque: {
          primary: '#1a3d2b',
          accent: '#c9a84c',
          active: '#1a7a4a',
        },
        mos: {
          primary: '#0F4C3A',
          'primary-hover': '#0D3D2F',
          'primary-deep': '#08362A',
          secondary: '#1D6B57',
          gold: '#D4AF37',
          'gold-bright': '#E8C547',
          'gold-dark': '#92680A',
          accent: '#D4AF37',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
          info: '#0284C7',
          bg: '#F8FAF9',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          'border-input': '#CBD5E1',
          text: '#0F172A',
          muted: '#64748B',
          sidebar: '#0F4C3A',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
