import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "client"), // client folder
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"), // your components & pages
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "client")], // allow access to client folder
    },
  },
});
