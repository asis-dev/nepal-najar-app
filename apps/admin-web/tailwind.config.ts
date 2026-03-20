import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core luxury palette
        np: {
          void: '#050510',        // Deepest black-blue
          base: '#07111F',        // App background — deep navy-black
          surface: '#0d1525',     // Card surfaces
          elevated: '#131f38',    // Elevated surfaces
          border: 'rgba(255,255,255,0.08)',
          'border-bright': 'rgba(255,255,255,0.15)',
        },
        // Primary accent — electric blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Cyan glow accent
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Status colors with glow capability
        status: {
          success: '#10b981',
          'success-glow': 'rgba(16, 185, 129, 0.2)',
          warning: '#f59e0b',
          'warning-glow': 'rgba(245, 158, 11, 0.2)',
          danger: '#ef4444',
          'danger-glow': 'rgba(239, 68, 68, 0.2)',
          info: '#3b82f6',
          'info-glow': 'rgba(59, 130, 246, 0.2)',
        },
        // Nepal themed
        nepal: {
          blue: '#003893',         // Flag blue
          red: '#DC143C',          // Flag crimson
          crimson: '#DC143C',      // Alias for accent
          dawn: '#D9A441',         // Sunrise gold (sparingly)
          slate: '#23364A',        // Mountain slate
          mist: '#DDE7F0',         // Snow mist
          mountain: '#1a365d',
          snow: '#f7fafc',
          forest: '#276749',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-mukta)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        nepali: ['var(--font-mukta)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'glow-blue': 'radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)',
        'glow-cyan': 'radial-gradient(ellipse at center, rgba(6,182,212,0.1) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(59, 130, 246, 0.3)',
        'glow-md': '0 0 25px -5px rgba(59, 130, 246, 0.4)',
        'glow-lg': '0 0 40px -8px rgba(59, 130, 246, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.4)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'count-up': 'count-up 1s ease-out',
        'progress-fill': 'progress-fill 1.2s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
