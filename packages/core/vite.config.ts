import { defineConfig } from "vite-plus";

export default defineConfig({
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
