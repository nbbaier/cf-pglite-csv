/// <reference types="vitest" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import alchemy from "alchemy/cloudflare/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "pglite",
              test: /node_modules[\\/]@electric-sql[\\/]pglite/,
            },
            {
              name: "codemirror",
              test: /node_modules[\\/](@codemirror|@uiw[\\/]react-codemirror)/,
            },
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
            {
              name: "data-grid",
              test: /node_modules[\\/]@tanstack[\\/]react-table/,
            },
            {
              name: "ui-vendor",
              test: /node_modules[\\/](@radix-ui|lucide-react|react-resizable-panels)[\\/]/,
            },
          ],
        },
      },
    },
  },
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
