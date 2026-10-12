import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/cli.ts"],
    exports: { bin: { "dialex-config": "./src/cli.ts" } },
  },
});
