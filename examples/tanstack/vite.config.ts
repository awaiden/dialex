import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

// No Dialex plugin: dictionaries come from src/dialex.generated.ts (see `dx generate`).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tanstackStart(), viteReact()],
});
