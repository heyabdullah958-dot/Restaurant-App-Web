/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Super-Admin Palette (Technical, Secure, Slate Grays & Blues)
        super: {
          bg: '#0F172A',       // slate-900
          card: '#1E293B',     // slate-800
          border: '#334155',   // slate-700
          text: '#F8FAFC',     // slate-50
          muted: '#94A3B8',    // slate-400
          accent: '#3B82F6',   // blue-500
          primary: '#2563EB',  // blue-600
        },
        // Branch Manager Accent Themes (Premium, VIP, Warm Accent / Rose / Amber)
        branch: {
          bg: '#FAFAFA',       // warm-gray-50
          card: '#FFFFFF',     // pure white
          border: '#E4E4E7',   // zinc-200
          text: '#09090B',     // zinc-950
          muted: '#71717A',    // zinc-500
          primary: '#EA580C',  // Orange (Food accent)
          secondary: '#F97316', // Light Orange
          vipGold: '#D97706',  // Amber VIP accent
        },
        // Restaurant Brand Accents (for brand-specific styling in Manager mode)
        seenbanao: '#EA580C',      // Desi BBQ (Orange)
        dineatblue: '#0284C7',     // Seafood (Sky Blue)
        jushhpk: '#DC2626',        // Fast Food (Red)
        tandooristoppk: '#B45309', // Tandoori (Amber)
        sandmelts: '#059669',      // Sandwiches (Emerald)
        birdmanfoodspk: '#9333EA',  // Chicken (Purple)
        getafomo: '#DB2777',       // Cafe (Pink)
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03)',
        'premium-hover': '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
        'glow-orange': '0 0 15px 2px rgba(234, 88, 12, 0.25)',
        'glow-blue': '0 0 15px 2px rgba(37, 99, 235, 0.25)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
