import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": env.API_URL || `http://localhost:${env.PORT || 3205}`,
      },
    },
  };
});
