import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH is set by the GitHub Pages deploy workflow to "/<repo-name>/"
// since project pages are served from a subpath, not the domain root.
// It's a plain env var (no VITE_ prefix), so read it via process.env
// rather than loadEnv(), which only picks up VITE_-prefixed vars.
export default defineConfig(() => ({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/",
}));
