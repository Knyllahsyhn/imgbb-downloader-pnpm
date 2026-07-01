/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          200: "#b8ccff",
          300: "#8babff",
          400: "#5c82ff",
          500: "#3a5cf5",
          600: "#2a41d6",
          700: "#2333ab",
          800: "#212d87",
          900: "#1f296b",
        },
      },
    },
  },
  plugins: [],
};
