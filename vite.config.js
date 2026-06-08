import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("react-dom") || id.includes("react-router-dom")) {
            return "vendor-react";
          }

          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          if (id.includes("recharts")) {
            return "vendor-charts";
          }

          if (id.includes("jspdf")) {
            return "vendor-pdf";
          }

          if (id.includes("leaflet") || id.includes("react-leaflet")) {
            return "vendor-maps";
          }

          if (id.includes("lucide-react") || id.includes("react-icons")) {
            return "vendor-icons";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
