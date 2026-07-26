// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#030712", // Dark Midnight/Navy Base
        foreground: "#f3f4f6",
        card: {
          DEFAULT: "rgba(10, 15, 30, 0.7)", // Glassmorphism dark panel
          border: "rgba(30, 41, 59, 0.5)",
        },
        brand: {
          navy: "#0A0F24",        // Deep Space Navy
          electric: "#00E5FF",    // Cyan / Neon Electric Blue
          gold: "#FFD700",        // Premium Gold Accent
          purple: "#7000FF",      // Cyberpunk Sub-accent
        },
        border: "rgba(255, 255, 255, 0.1)",
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 229, 255, 0.2)",
        goldGlow: "0 0 25px rgba(255, 215, 0, 0.15)",
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'matrix-glow': 'glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
