import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SkillMeet-inspired dark navy palette
        background:      '#0d1117',
        surface:         '#161b22',
        surfaceHover:    '#1c2333',
        surfaceHighlight:'#21262d',

        primary: {
          DEFAULT: '#00bcd4',
          hover:   '#00acc1',
          muted:   'rgba(0,188,212,0.12)',
        },
        secondary: {
          DEFAULT: '#3b82f6',
        },
        accent: {
          DEFAULT: '#ef4444',
        },
        success: {
          DEFAULT: '#22c55e',
        },
        warning: {
          DEFAULT: '#f59e0b',
        },

        textMain:      '#e6edf3',
        textSecondary: '#8b949e',
        textMuted:     '#6e7681',

        borderSubtle: '#21262d',
        borderStrong: '#30363d',
        borderActive: '#00bcd4',
      },
      backgroundImage: {
        'gradient-primary':   'linear-gradient(135deg, #00bcd4 0%, #3b82f6 100%)',
        'gradient-teal-blue': 'linear-gradient(135deg, #0891b2 0%, #1d4ed8 100%)',
        'gradient-danger':    'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
        'gradient-success':   'linear-gradient(135deg, #16a34a 0%, #0891b2 100%)',
        'gradient-surface':   'linear-gradient(135deg, #161b22 0%, #1c2333 100%)',
        'gradient-radial':    'radial-gradient(var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease-out forwards',
        'slide-up':     'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down':   'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow':   'pulseGlow 3s ease-in-out infinite',
        'shimmer':      'shimmer 1.8s infinite linear',
        'spin-slow':    'spin 3s linear infinite',
        'bounce-soft':  'bounceSoft 0.6s ease-out',
        'step-in':      'stepIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.3', filter: 'blur(24px)' },
          '50%':      { opacity: '0.6', filter: 'blur(32px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSoft: {
          '0%':   { transform: 'scale(0.92)' },
          '60%':  { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        stepIn: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'glow-cyan':    '0 0 20px rgba(0,188,212,0.25)',
        'glow-blue':    '0 0 20px rgba(59,130,246,0.25)',
        'card':         '0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)',
        'panel':        '0 4px 24px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
export default config
