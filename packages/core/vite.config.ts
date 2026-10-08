import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const stub = (name: string) => fileURLToPath(new URL(`./tests/stubs/${name}.ts`, import.meta.url));

export default defineConfig({
  test: {
    // The bundler plugins provide these virtual modules at build time; tests mock them.
    alias: {
      "virtual:dialex-dictionaries": stub("dictionaries"),
      "virtual:dialex-config": stub("config"),
    },
  },
  pack: {
    entry: [
      "src/index.ts",
      "src/react.ts",
      "src/vite.ts",
      "src/next.ts",
      "src/server.ts",
      "src/hono.ts",
      "src/express.ts",
      "src/fastify.ts",
      "src/koa.ts",
      "src/nestjs.ts",
      "src/elysia.ts",
      "src/sveltekit.ts",
      "src/astro.ts",
      "src/vue.ts",
      "src/nuxt.ts",
      "src/routing.ts",
      "src/icu/index.ts",
      "src/web.ts",
      "src/angular.ts",
      "src/h3.ts",
      "src/next/middleware.ts",
      "src/next/link.ts",
      "src/testing/index.ts",
      "src/testing/react.ts",
      "src/testing/vue.ts",
      "src/scanner.ts",
    ],
    deps: {
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
    },

    exports: true,
  },
});
