import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    environmentMatchGlobs: [
      ["vendor/orun-shield-core/tests/**", "node"],
      ["vendor/orun-system-optimizer/tests/**", "node"],
      ["electron/__tests__/**", "node"],
    ],
    exclude: [
      "**/node_modules/**",
      "**/vendor/orun-settings/src/react/hooks.test.tsx",
      "**/vendor/orun-sync/src/react/use-sync-conflicts.test.tsx",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
