/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        dark: {
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#1e1e2e",
          muted: "#6b7280",
        },
        accent: {
          primary: "#6366f1",
          secondary: "#a78bfa",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
        chat: {
          me: "#6366f1",
          stranger: "#1e1e2e",
        },
      },
      fontFamily: {
        sans: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
