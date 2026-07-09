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

          const normalizedId = id.replaceAll("\\", "/");
          const inPackage = (name) => normalizedId.includes(`/node_modules/${name}`);

          if (
            inPackage("react") ||
            inPackage("react-dom") ||
            inPackage("react-router") ||
            inPackage("react-router-dom") ||
            inPackage("scheduler")
          ) {
            return "vendor-react";
          }

          if (inPackage("@supabase")) {
            return "vendor-supabase";
          }

          if (inPackage("recharts") || inPackage("d3-") || inPackage("victory-vendor")) {
            return "vendor-charts";
          }

          if (inPackage("core-js") || inPackage("@babel/runtime")) {
            return "vendor-pdf-polyfills";
          }

          if (
            inPackage("canvg") ||
            inPackage("dompurify") ||
            inPackage("html2canvas") ||
            inPackage("performance-now") ||
            inPackage("raf") ||
            inPackage("rgbcolor") ||
            inPackage("stackblur-canvas") ||
            inPackage("svg-pathdata")
          ) {
            return "vendor-pdf-render";
          }

          if (inPackage("jspdf") || inPackage("fflate")) {
            return "vendor-pdf";
          }

          if (inPackage("leaflet") || inPackage("react-leaflet")) {
            return "vendor-maps";
          }

          if (inPackage("lucide-react") || inPackage("react-icons")) {
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
