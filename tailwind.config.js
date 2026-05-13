/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx,html}',
    './app/**/*.{ts,tsx,js,jsx,mdx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        russo: ['"Russo One"', 'sans-serif'],
        orbitron: ['Orbitron', 'monospace'],
        montserrat: ['Montserrat', 'sans-serif']
      },
      screens: {
        'xs-height': { 'raw': '(max-height: 550px)' },
        'landscape-xs': { 'raw': '(orientation: landscape) and (max-height: 550px)' }
      },
      keyframes: {
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        shine: {
          '0%': { left: '-100%' },
          '50%': { left: '100%' },
          '100%': { left: '100%' }
        },
        scoreboardPulse: {
          '0%': {
            transform: 'scale(1)',
            'box-shadow': '0 12px 28px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.3)'
          },
          '50%': {
            transform: 'scale(1.03)',
            'box-shadow': '0 14px 30px rgba(0, 0, 0, 0.5), inset 0 2px 6px rgba(255, 255, 255, 0.08)'
          },
          '100%': {
            transform: 'scale(1)',
            'box-shadow': '0 12px 28px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.3)'
          }
        },
        bestScorePop: {
          '0%': {
            transform: 'scale(1)',
            'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.25)'
          },
          '50%': {
            transform: 'scale(1.06)',
            'box-shadow': '0 4px 14px rgba(0, 0, 0, 0.3), 0 0 18px rgba(255, 238, 0, 0.35)'
          },
          '100%': {
            transform: 'scale(1)',
            'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.25)'
          }
        },
        'gold-glow': {
          '0%, 100%': { 'box-shadow': '0 6px 20px rgba(255, 193, 7, 0.5), 0 0 30px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -2px 8px rgba(0, 0, 0, 0.25)' },
          '50%': { 'box-shadow': '0 6px 25px rgba(255, 193, 7, 0.7), 0 0 40px rgba(255, 215, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -2px 8px rgba(0, 0, 0, 0.25)' }
        },
        'rainbow-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'icon-pulse': {
          '0%, 100%': { transform: 'scale(1)', filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' },
          '50%': { transform: 'scale(1.1)', filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 12px rgba(255, 255, 255, 0.7))' }
        }
      },
      animation: {
        'fade-in-down': 'fadeInDown 0.8s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in': 'fadeIn 1s ease-out both',
        'fade-in-fast': 'fadeIn 0.2s ease-out both',
        'fade-in-delayed': 'fadeIn 1s ease-out 0.5s both',
        shine: 'shine 2s linear infinite',
        'scoreboard-pulse': 'scoreboardPulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'best-score-pop': 'bestScorePop 0.8s ease-out',
        'gold-glow': 'gold-glow 2s ease-in-out infinite',
        'rainbow-spin': 'rainbow-spin 4s linear infinite',
        'icon-pulse': 'icon-pulse 2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
