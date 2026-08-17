import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      // server-only throws outside Next.js; redirect to an empty stub so
      // server-side modules can be imported and tested in Node.
      "server-only": path.join(root, "__mocks__/server-only.mjs"),
    },
  },
});
