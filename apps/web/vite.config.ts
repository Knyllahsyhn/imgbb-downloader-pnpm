/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const DEFAULT_SITE_URL = "https://knyllahsyhn.github.io/imgbb-downloader-pnpm/";

/**
 * Adds a Content-Security-Policy meta tag to the production build.
 * GitHub Pages cannot send response headers, so the policy has to live in the
 * HTML. It is left out in dev because Vite's dev server injects inline scripts.
 */
function contentSecurityPolicy(apiBaseUrl: string | undefined): Plugin {
  const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : "";
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    // Image hosts: imgbb and Catbox. Both send CORS headers on their files.
    "img-src 'self' https://i.ibb.co https://files.catbox.moe data:",
    `connect-src 'self' https://i.ibb.co https://files.catbox.moe ${apiOrigin}`.trim(),
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: policy },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd()), ...process.env };
  // Read by Vite when it replaces %VITE_SITE_URL% in index.html.
  process.env.VITE_SITE_URL ??= env.VITE_SITE_URL ?? DEFAULT_SITE_URL;

  return {
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_API_BASE_URL)],
    base: process.env.BASE_PATH ?? "/",
    test: {
      include: ["src/**/*.test.ts"],
    },
  };
});
