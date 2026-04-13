/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cyberpunk color palette
        terminal: {
          bg: "#0a0a0f",
          surface: "#0f0f1a",
          border: "#1a1a2e",
        },
        neon: {
          green: "#4ade80",
          "green-bright": "#22c55e",
          "green-soft": "#86efac",
          cyan: "#22d3ee",
          "cyan-soft": "#67e8f9",
          pink: "#ec4899",
          "pink-soft": "#f472b6",
          yellow: "#eab308",
        },
        matrix: {
          green: "#16a34a",
          dark: "#052e16",
        },
        // Custom gray shade used in hover states
        "gray-750": "#2d3748",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      boxShadow: {
        "neon-green": "0 0 15px rgba(74, 222, 128, 0.2)",
        "neon-cyan": "0 0 15px rgba(34, 211, 238, 0.2)",
        "neon-pink": "0 0 15px rgba(236, 72, 153, 0.2)",
        cyber:
          "0 0 15px rgba(74, 222, 128, 0.15), inset 0 0 15px rgba(74, 222, 128, 0.03)",
      },
      animation: {
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        "cyber-glow": "cyber-glow 3s ease-in-out infinite",
        blink: "blink 1s infinite",
      },
    },
  },
  plugins: [],
};
