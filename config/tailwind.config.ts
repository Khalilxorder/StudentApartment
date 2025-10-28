// FILE: tailwind.config.ts

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Add your custom colors here
      colors: {
        'design-background': '#B7B7B7', // The main page background
        'design-container': '#E0E0E0', // The form container background
        'design-field': '#D9D9D9', // The input field background
      },
      borderRadius: {
        'design': '4px', // Custom border radius
      }
    },
  },
  plugins: [],
};
export default config;