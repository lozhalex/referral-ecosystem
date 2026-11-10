/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Глубокий темный фон (почти черный с синим подтоном)
        dark: {
          900: '#0B0F19', 
          800: '#151B2B', 
          700: '#1E293B', 
        },
        // Неоновые акценты
        neon: {
          purple: '#8B5CF6', 
          cyan: '#06B6D4',   
          green: '#10B981',  
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'], 
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(139, 92, 246, 0.25)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.25)',
      }
    },
  },
  plugins: [],
}