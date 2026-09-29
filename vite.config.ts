import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { exclude: ["@livestore/wa-sqlite"] },
  environments: {
    soba: {
      // Discover cookie imports before the Worker starts to avoid an optimizer reload race.
      optimizeDeps: { include: ["better-auth/cookies", "hono/utils/cookie"] },
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
      routeToken: "_layout",
      autoCodeSplitting: true,
      routesDirectory: "./src/client/routes",
      generatedRouteTree: "./src/client/routeTree.gen.ts",
    }),
    react({ compiler: true }),
    tailwindcss(),
    cloudflare(),
  ],
  resolve: { tsconfigPaths: true },
});
