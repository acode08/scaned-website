import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'teal-primary': '#6DCAC3',
        'teal-dark': '#5AB9B3',
        'teal-50': '#E8F8F7',
      },
    },
  },
  plugins: [],
};

export default config;