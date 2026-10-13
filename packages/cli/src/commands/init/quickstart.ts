import pc from "picocolors";

import { logger } from "../../utils/logger.js";

/** What `dialex init` prints for each framework, after the files are written. */
const SNIPPETS: Record<string, string> = {
  hono: `
import { Hono } from "hono";
import { dialexHono } from "dialexjs/hono";
import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title });
});
`,
  fastify: `
import Fastify from "fastify";
import { dialexPlugin } from "dialexjs/fastify";
import { dialex } from "./src/dialex.generated.js";

const app = Fastify();
await app.register(dialexPlugin, { ...dialex });

app.get("/", (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title };
});
`,
  express: `
import express from "express";
import { dialexExpress } from "dialexjs/express";
import { dialex } from "./src/dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title });
});
`,
  koa: `
import Koa from "koa";
import { dialexKoa } from "dialexjs/koa";
import { dialex } from "./src/dialex.generated.js";

const app = new Koa();
app.use(dialexKoa({ ...dialex }));

app.use((ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title };
});
`,
  nestjs: `
import { Module } from "@nestjs/common";
import { DialexModule } from "dialexjs/nestjs";
import { dialex } from "./src/dialex.generated.js";

@Module({
  imports: [DialexModule.forRoot({ ...dialex })],
})
export class AppModule {}
`,
  next: `
// src/dialex.ts
import { createDialexServer } from "dialexjs/server";
import { dialex } from "./dialex.generated";

export const { getDictionary, getT } = createDialexServer(dialex);

// app/[locale]/page.tsx (Server Component)
import { getDictionary } from "../../dialex";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale = "en" } = await params;
  const dict = getDictionary("home", locale);
  return <h1>{dict.title}</h1>;
}

// For client components, render the provider inside a "use client" file:
//   "use client";
//   import { DialexProvider } from "dialexjs/react";
//   import { dialex } from "./dialex.generated";
//   export const Providers = ({ children }) => <DialexProvider {...dialex}>{children}</DialexProvider>;
`,
  react: `
// src/main.tsx
import { createRoot } from "react-dom/client";
import { DialexProvider } from "dialexjs/react";
import { dialex } from "./dialex.generated";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
);

// In components: const dict = useDictionary("home")
`,
  elysia: `
import { Elysia } from "elysia";
import { dialexElysia } from "dialexjs/elysia";
import { dialex } from "./src/dialex.generated.js";

new Elysia()
  .use(dialexElysia({ ...dialex }))
  .get("/", ({ getDictionary }) => ({ title: getDictionary("home").title }))
  .listen(3000);
`,
  sveltekit: `
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";
import { dialex } from "./dialex.generated.js";

export const handle = dialexHandle({ ...dialex });

// src/app.html: <html lang="%dialex.lang%">
// In load functions: locals.getDictionary("home")
`,
  astro: `
// src/middleware.ts
import { dialexAstro } from "dialexjs/astro";
import { dialex } from "./dialex.generated.js";

export const onRequest = dialexAstro({ ...dialex });

// In pages: Astro.locals.getDictionary("home")
`,
  vue: `
// src/main.ts
import { createApp } from "vue";
import { createDialex } from "dialexjs/vue";
import { dialex } from "./dialex.generated";
import App from "./App.vue";

createApp(App).use(createDialex({ ...dialex })).mount("#app");

// In components: const dict = useDictionary("home")
`,
  svelte: `
<!-- src/App.svelte -->
<script lang="ts">
  import { provideDialex, useDictionary } from "dialexjs/svelte";
  import { dialex } from "./dialex.generated";

  const { locale, setLocale } = provideDialex({ ...dialex });
  const home = useDictionary("home");
</script>

<h1>{$home.title}</h1>
<button onclick={() => setLocale("tr")}>TR</button>
`,
  solid: `
// src/index.tsx
import { render } from "solid-js/web";
import { DialexProvider } from "dialexjs/solid";
import { dialex } from "./dialex.generated";
import App from "./App";

render(
  () => (
    <DialexProvider {...dialex}>
      <App />
    </DialexProvider>
  ),
  document.getElementById("root")!,
);

// In components: const home = useDictionary("home"); then {home().title}
`,
  "react-router": `
// app/dialex.server.ts
import { createDialexHandler } from "dialexjs/web";
import { dialex } from "./dialex.generated";

export const resolveDialex = createDialexHandler({ ...dialex });

// app/root.tsx
import { DialexProvider } from "dialexjs/react";
import { useLoaderData } from "react-router";
import { dialex } from "./dialex.generated";
import { resolveDialex } from "./dialex.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { locale } = await resolveDialex(request);
  return { locale };
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  return (
    <DialexProvider {...dialex} initialLocale={locale}>
      <Outlet />
    </DialexProvider>
  );
}
`,
  preact: `
// src/index.tsx
import { render } from "preact";
import { DialexProvider } from "dialexjs/preact";
import { dialex } from "./dialex.generated";
import { App } from "./app";

render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
  document.getElementById("app")!,
);

// In components: const dict = useDictionary("home")
`,
  qwik: `
// src/i18n.ts
import { createDialexQwik } from "dialexjs/qwik";
import { dialex } from "./dialex.generated";

export const { useDialexProvider, useDialex, setLocale, useDictionary, useT } =
  createDialexQwik({ ...dialex });

// src/routes/layout.tsx
export default component$(() => {
  useDialexProvider();
  return <Slot />;
});

// In components: const home = useDictionary("home"); then {home().title}
`,
  lit: `
// src/i18n.ts
import { createDialex } from "dialexjs/lit";
import { dialex } from "./dialex.generated";

export const i18n = createDialex({ ...dialex });

// src/my-element.ts
import { LitElement, html } from "lit";
import { DialexController } from "dialexjs/lit";
import { i18n } from "./i18n";

class MyElement extends LitElement {
  private dx = new DialexController(this, i18n);

  render() {
    return html\`<h1>\${this.dx.dictionary("home").title}</h1>\`;
  }
}
`,
  "react-native": `
// App.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { DialexProvider } from "dialexjs/react-native";
import { dialex } from "./src/dialex.generated";

export default function App() {
  return (
    <DialexProvider
      {...dialex}
      deviceLocales={getLocales().map((locale) => locale.languageTag)}
      storage={AsyncStorage}
    >
      <Home />
    </DialexProvider>
  );
}

// In components: const dict = useDictionary("home")
`,
  hapi: `
import Hapi from "@hapi/hapi";
import { dialexPlugin } from "dialexjs/hapi";
import { dialex } from "./src/dialex.generated.js";

const server = Hapi.server({ port: 3000 });
await server.register({ plugin: dialexPlugin, options: { ...dialex } });

server.route({
  method: "GET",
  path: "/",
  handler: (request) => ({ title: request.getDictionary("home").title }),
});
`,
  adonis: `
// app/middleware/dialex_middleware.ts
import { createDialexMiddleware } from "dialexjs/adonis";
import { dialex } from "#start/dialex.generated";

export default createDialexMiddleware({ ...dialex });

// start/kernel.ts
router.use([() => import("#middleware/dialex_middleware")]);

// In handlers: ctx.locale, ctx.getDictionary("home")
`,
  trpc: `
// src/trpc.ts
import { initTRPC } from "@trpc/server";
import { createDialexContext } from "dialexjs/trpc";
import { dialex } from "./dialex.generated.js";

const resolveDialex = createDialexContext({ ...dialex });

export const createContext = ({ req }: { req: Request }) => ({ ...resolveDialex(req) });

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();

export const appRouter = t.router({
  greeting: t.procedure.query(({ ctx }) => ctx.getDictionary("home").title),
});
`,
  nuxt: `
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["dialexjs/nuxt"],
});

// In components: const dict = useDictionary("home")
`,
};

/** Printed for a framework without a snippet of its own. */
const FALLBACK = `
Import dictionaries and register your framework middleware to begin!
Run \`npm run dx:generate\` whenever you add new dictionary files.
`;

export function printQuickstart(framework: string): void {
  logger.log("");
  logger.info(pc.bold(`Quick start for ${framework.toUpperCase()}:`));
  logger.log(Object.hasOwn(SNIPPETS, framework) ? SNIPPETS[framework] : FALLBACK);
}
