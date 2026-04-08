import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card:    "0 1px 3px rgba(15,17,23,0.04), 0 4px 12px rgba(15,17,23,0.05)",
        "card-md": "0 2px 8px rgba(15,17,23,0.06), 0 8px 24px rgba(15,17,23,0.07)",
        modal:   "0 8px 32px rgba(15,17,23,0.10), 0 24px 64px rgba(15,17,23,0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          "0%":   { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up":   "fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in":   "fade-in 0.25s ease-out",
        "scale-in":  "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down":"slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer:     "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
