import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18251e",
        moss: "#176b4c",
        canvas: "#f6f8f4",
        line: "#e3e9e2",
        coral: "#de7654",
        muted: "#64736a",
        soft: "#e9f3ec",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 20px 60px rgba(24,37,30,.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
