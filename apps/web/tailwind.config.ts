import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#15161c",
        sidebar: "#101116",
        card: "#1c1d27",
        border: "#26272f",
        accent: {
          DEFAULT: "#6366f1",
          hover: "#5558e0",
          muted: "#6366f133",
        },
        muted: "#8b8d98",
      },
      borderRadius: {
        DEFAULT: "12px",
        lg: "16px",
      },
    },
  },
  plugins: [],
} satisfies Config;
