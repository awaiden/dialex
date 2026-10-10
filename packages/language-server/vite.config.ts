import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/server.ts", "src/features.ts"],
    // The CLI API is a regular dependency; only the language server's own code is built.
    exports: { bin: { "dialex-language-server": "./src/index.ts" } },
  },
});
