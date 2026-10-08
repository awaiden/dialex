import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    exports: { bin: { "dialex-mcp": "./src/index.ts" } },
  },
});
