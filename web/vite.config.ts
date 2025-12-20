import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    // Calls /api/btc on the same origin during dev by proxying to Vercel-style functions path.
    // In local dev, Vite serves and the API is still requested from /api/btc.
    // If you want to run Vercel dev, you can remove this and use `vercel dev`.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});
