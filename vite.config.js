import { defineConfig } from "vite";
export default defineConfig({
  server: {
    proxy: {
      // Preserve the browser's host so the API can enforce same-origin requests.
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: false },
    },
  },
});
