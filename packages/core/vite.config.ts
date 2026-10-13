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
    // Output names are explicit: where a source file lives must not decide the public subpath.
    entry: {
      index: "src/index.ts",
      react: "src/client/react.ts",
      "react-native": "src/client/react-native.ts",
      preact: "src/client/preact.ts",
      vue: "src/client/vue.ts",
      svelte: "src/client/svelte.ts",
      solid: "src/client/solid.ts",
      qwik: "src/client/qwik.ts",
      lit: "src/client/lit.ts",
      angular: "src/client/angular.ts",
      "next/link": "src/client/next/link.ts",
      server: "src/server/index.ts",
      hono: "src/server/hono.ts",
      express: "src/server/express.ts",
      fastify: "src/server/fastify.ts",
      koa: "src/server/koa.ts",
      nestjs: "src/server/nestjs/index.ts",
      elysia: "src/server/elysia.ts",
      sveltekit: "src/server/sveltekit.ts",
      hapi: "src/server/hapi.ts",
      adonis: "src/server/adonis.ts",
      trpc: "src/server/trpc.ts",
      astro: "src/server/astro.ts",
      web: "src/server/web.ts",
      h3: "src/server/h3.ts",
      "next/middleware": "src/server/next/middleware.ts",
      nuxt: "src/modules/nuxt.ts",
      routing: "src/core/routing.ts",
      "icu/index": "src/core/icu/index.ts",
      "testing/index": "src/testing/index.ts",
      "testing/react": "src/testing/react.ts",
      "testing/vue": "src/testing/vue.ts",
    },
    deps: {
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
    },

    exports: true,
  },
});
