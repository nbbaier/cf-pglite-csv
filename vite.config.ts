/// <reference types="vitest" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import alchemy from "alchemy/cloudflare/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), alchemy()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    dedupe: [
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/language",
      "@codemirror/lang-sql",
    ],
  },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite", "@electric-sql/pglite/worker"],
  },
});
