/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Refined dark theme - Midnight aesthetic
        dark: {
          bg: "#050508",
          surface: "#0c0c12",
          elevated: "#141420",
          border: "#1f1f2e",
          muted: "#64648b",
        },
        accent: {
          primary: "#7c5cff",
          secondary: "#b794f6",
          glow: "#9d7aff",
          success: "#22c55e",
          warning: "#fbbf24",
          danger: "#f43f5e",
        },
        chat: {
          me: "#7c5cff",
          stranger: "#1a1a28",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};
