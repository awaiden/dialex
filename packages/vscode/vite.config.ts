import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/extension.ts"],
    // VS Code loads extensions as CommonJS, and the host provides the `vscode` module.
    format: "cjs",
    platform: "node",
    dts: false,
    exports: false,
    deps: {
      // Everything except `vscode` is bundled so the .vsix needs no node_modules.
      alwaysBundle: [/.*/],
      neverBundle: ["vscode"],
    },
  },
});
