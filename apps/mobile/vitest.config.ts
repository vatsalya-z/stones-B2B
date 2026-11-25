import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@stone/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@stone/utils": path.resolve(__dirname, "../../packages/utils/src/index.ts"),
      "@stone/validation": path.resolve(__dirname, "../../packages/validation/src/index.ts"),
      "@stone/database": path.resolve(__dirname, "../../packages/database/src/index.ts"),
      "@stone/auth": path.resolve(__dirname, "../../packages/auth/src/index.ts"),
    },
  },
});
