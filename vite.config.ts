import { readFileSync } from "node:fs";
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8")
) as { version?: string };

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version ?? "0.0.0"),
  },
  server: {
    proxy: {
      "/__metagen_bridge": {
        target: "http://127.0.0.1:30120",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__metagen_bridge/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2021",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Monaco editor is large; isolate it so it only loads with CodePreview.
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
            return "monaco";
          }

          // Keep XML parsing separate because it is only needed for file operations.
          if (id.includes("node_modules") && id.includes("fast-xml-parser")) {
            return "xml-parser";
          }
        },
      },
    },
  },
})
