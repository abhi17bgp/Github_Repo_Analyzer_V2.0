/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'github': {
          'dark': '#0d1117',
          'darker': '#010409',
          'border': '#30363d',
          'text': '#f0f6fc',
          'text-secondary': '#8b949e',
          'accent': '#238636',
          'accent-hover': '#2ea043',
        }
      },
      animation: {
        'github-glow': 'github-glow 2s ease-in-out infinite',
        'github-float': 'github-float 3s ease-in-out infinite',
        'github-shimmer': 'github-shimmer 2s infinite',
      },
      keyframes: {
        'github-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(35, 134, 54, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(35, 134, 54, 0.6)',
          },
        },
        'github-float': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        'github-shimmer': {
          '0%': {
            backgroundPosition: '-200% 0',
          },
          '100%': {
            backgroundPosition: '200% 0',
          },
        },
      },
    },
  },
  plugins: [],
};
