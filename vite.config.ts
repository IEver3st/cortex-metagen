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
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Monaco editor is ~2MB — isolate it so it only loads when CodePreview mounts
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
            return "monaco";
          }
          // Group other large vendor deps
          if (id.includes("node_modules")) {
            if (id.includes("fast-xml-parser")) return "xml-parser";
            if (id.includes("radix-ui") || id.includes("@radix-ui")) return "ui-primitives";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("react-resizable-panels")) return "panels";
            // Core React + Zustand stay in the main vendor chunk
            if (id.includes("react") || id.includes("react-dom") || id.includes("zustand")) return "vendor";
          }
        },
      },
    },
  },
})
