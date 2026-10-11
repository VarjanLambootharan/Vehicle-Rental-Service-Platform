import { encodeText } from "./src/api/text";
import { defineConfig, loadEnv } from "vite";
import type { ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  // Vite does not put values from .env files onto process.env for config files.
  // Load every prefix here because this is server-only proxy configuration.
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget =
    env.TRAVELER_API_TARGET || env.VRS_API_TARGET || "http://localhost:8080";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (_error, _request, response) => {
              if (!("writeHead" in response)) return;
              const serverResponse = response as ServerResponse;
              if (serverResponse.headersSent) return;
              serverResponse.writeHead(503, {
                "Content-Type": "text/plain; charset=utf-8",
              });
              serverResponse.end(
                encodeText({
                  code: "API_UNAVAILABLE",
                  message:
                    "The rental service is unavailable. Start Spring Boot on the configured API target and try again.",
                }),
              );
            });
          },
        },
      },
    },
  };
});
