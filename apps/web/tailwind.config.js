/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    
    plugins: [],
    // Enable RTL support
    corePlugins: {
        preflight: true,
    },
    theme: {
    extend: {
      fontFamily: {
       
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji'],
       
        arabic: ['Cairo', 'Inter', 'system-ui', 'Arial', 'Noto Sans Arabic', 'sans-serif'],
      },
      colors: {
        'primary': {
          DEFAULT: '#0D9488',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488', // Main primary
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        'secondary': {
          DEFAULT: '#1E293B',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B', // Main secondary
          900: '#0F172A',
        },
        'accent': {
          DEFAULT: '#F97316',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316', // Main accent
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
      },
    },
  },
  }