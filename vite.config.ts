
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
   proxy: {
     '/api': {
       target: 'http://127.0.0.1:3000',
       changeOrigin: true,
       secure: false,
    },
  },
},
,
  build: {
    outDir: "static", // Change output directory from dist to static
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
