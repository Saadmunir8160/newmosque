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
          'primary-hover': '#16624A',
          'primary-deep': '#0B3D2E',
          secondary: '#1E5E49',
          gold: '#C8A24A',
          'gold-bright': '#E0BC6A',
          'gold-dark': '#92680A',
          accent: '#C8A24A',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
          info: '#2563EB',
          bg: '#F7F9F8',
          surface: '#FFFFFF',
          border: '#E5E7EB',
          'border-input': '#CBD5E1',
          text: '#0F172A',
          muted: '#64748B',
          sidebar: '#0F4C3A',
          'sidebar-hover': '#16624A',
          'sidebar-active': '#1E5E49',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 2px 8px rgba(15, 23, 42, 0.06)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      spacing: {
        sa: '8px',
      },
    },
  },
  plugins: [],
};
