import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // Qwik's server build is bundled by Vite here so the alias below reaches its import.
    server: { deps: { inline: ["@builder.io/qwik"] } },
    alias: {
      "@qwik-client-manifest": fileURLToPath(
        new URL("./tests/stubs/qwik-client-manifest.ts", import.meta.url),
      ),
    },
  },
  pack: {
    entry: [
      "src/index.ts",
      "src/react.ts",
      "src/server.ts",
      "src/hono.ts",
      "src/express.ts",
      "src/fastify.ts",
      "src/koa.ts",
      "src/nestjs.ts",
      "src/elysia.ts",
      "src/sveltekit.ts",
      "src/svelte.ts",
      "src/solid.ts",
      "src/preact.ts",
      "src/qwik.ts",
      "src/lit.ts",
      "src/react-native.ts",
      "src/hapi.ts",
      "src/adonis.ts",
      "src/trpc.ts",
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
