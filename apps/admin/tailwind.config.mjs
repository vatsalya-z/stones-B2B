/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — warm stone/sand tones
        stone: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
        // Accent — warm amber for CTAs
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        // Brand semantic tokens
        brand: {
          primary: "#292524",
          secondary: "#57534e",
          accent: "#d97706",
          "accent-hover": "#b45309",
          surface: "#fafaf9",
          "surface-raised": "#f5f5f4",
          border: "#e7e5e4",
          muted: "#78716c",
          text: "#1c1917",
          "text-muted": "#57534e",
        },
        // Status
        verified: "#15803d",
        "verified-bg": "#f0fdf4",
        "verified-border": "#bbf7d0",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        112: "28rem",
        128: "32rem",
      },
      maxWidth: {
        "8xl": "88rem",
        "9xl": "96rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        product: "0 2px 8px 0 rgb(0 0 0 / 0.08)",
        "product-hover": "0 8px 24px 0 rgb(0 0 0 / 0.12)",
      },
      aspectRatio: {
        "4/3": "4 / 3",
        "3/2": "3 / 2",
        product: "3 / 2",
      },
    },
  },
  plugins: [],
};

export default config;
