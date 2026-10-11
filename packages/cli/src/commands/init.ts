import fs from "node:fs";
import path from "node:path";

import * as p from "@clack/prompts";
import { parseModule, loadFile, writeFile } from "magicast";
import { addNuxtModule } from "magicast/helpers";
import pc from "picocolors";

import { detectFramework, type SupportedFramework } from "../utils/detector.js";
import { logger } from "../utils/logger.js";
import { addRequiredPackages, installCommand } from "../utils/package-json.js";
import { generateDictionaries } from "./generate.js";

export interface InitOptions {
  cwd?: string;
  framework?: string;
  defaultLocale?: string;
  locales?: string;
  yes?: boolean;
  ai?: boolean;
  noAi?: boolean;
}

export async function runInit(options: InitOptions = {}) {
  const root = options.cwd || process.cwd();
  const detected = detectFramework(root);
  const isInteractive = !options.yes && process.stdin.isTTY;

  let framework = (options.framework as SupportedFramework) || detected.framework;
  let defaultLocale = options.defaultLocale || "en";
  let localesInput = options.locales || "en,tr";

  if (isInteractive) {
    p.intro(pc.bgCyan(pc.black(" dialex init ")));

    const frameworkOptions: { value: SupportedFramework; label: string; hint?: string }[] = [
      {
        value: "hono",
        label: "Hono",
        hint: detected.framework === "hono" ? "detected" : undefined,
      },
      {
        value: "express",
        label: "Express",
        hint: detected.framework === "express" ? "detected" : undefined,
      },
      {
        value: "fastify",
        label: "Fastify",
        hint: detected.framework === "fastify" ? "detected" : undefined,
      },
      {
        value: "koa",
        label: "Koa",
        hint: detected.framework === "koa" ? "detected" : undefined,
      },
      {
        value: "nestjs",
        label: "NestJS",
        hint: detected.framework === "nestjs" ? "detected" : undefined,
      },
      {
        value: "next",
        label: "Next.js",
        hint: detected.framework === "next" ? "detected" : undefined,
      },
      {
        value: "react",
        label: "React / Vite",
        hint: detected.framework === "react" ? "detected" : undefined,
      },
      {
        value: "elysia",
        label: "Elysia",
        hint: detected.framework === "elysia" ? "detected" : undefined,
      },
      {
        value: "sveltekit",
        label: "SvelteKit",
        hint: detected.framework === "sveltekit" ? "detected" : undefined,
      },
      {
        value: "astro",
        label: "Astro",
        hint: detected.framework === "astro" ? "detected" : undefined,
      },
      {
        value: "vue",
        label: "Vue / Vite",
        hint: detected.framework === "vue" ? "detected" : undefined,
      },
      {
        value: "nuxt",
        label: "Nuxt",
        hint: detected.framework === "nuxt" ? "detected" : undefined,
      },
      {
        value: "svelte",
        label: "Svelte / Vite",
        hint: detected.framework === "svelte" ? "detected" : undefined,
      },
      {
        value: "solid",
        label: "Solid / Vite",
        hint: detected.framework === "solid" ? "detected" : undefined,
      },
      {
        value: "react-router",
        label: "React Router",
        hint: detected.framework === "react-router" ? "detected" : undefined,
      },
      {
        value: "react-native",
        label: "React Native / Expo",
        hint: detected.framework === "react-native" ? "detected" : undefined,
      },
      {
        value: "preact",
        label: "Preact / Vite",
        hint: detected.framework === "preact" ? "detected" : undefined,
      },
      {
        value: "qwik",
        label: "Qwik",
        hint: detected.framework === "qwik" ? "detected" : undefined,
      },
      {
        value: "lit",
        label: "Lit / Web Components",
        hint: detected.framework === "lit" ? "detected" : undefined,
      },
      {
        value: "hapi",
        label: "Hapi",
        hint: detected.framework === "hapi" ? "detected" : undefined,
      },
      {
        value: "adonis",
        label: "AdonisJS",
        hint: detected.framework === "adonis" ? "detected" : undefined,
      },
      {
        value: "trpc",
        label: "tRPC",
        hint: detected.framework === "trpc" ? "detected" : undefined,
      },
    ];

    const selectedFramework = await p.select({
      message: `Framework detected as ${pc.bold(detected.framework)} (${detected.matchedRule}). Select framework:`,
      options: frameworkOptions,
      initialValue: detected.framework,
    });

    if (p.isCancel(selectedFramework)) {
      p.cancel("Operation cancelled.");
      return;
    }
    framework = selectedFramework as SupportedFramework;

    const inputDefault = await p.text({
      message: "What is your default locale?",
      initialValue: "en",
      validate: (v) => (!v || !v.trim() ? "Default locale cannot be empty" : undefined),
    });

    if (p.isCancel(inputDefault)) {
      p.cancel("Operation cancelled.");
      return;
    }
    defaultLocale = inputDefault.trim();

    const inputLocales = await p.text({
      message: "Comma-separated list of supported locales:",
      initialValue: `${defaultLocale},tr`,
      validate: (v) => (!v || !v.trim() ? "Locales list cannot be empty" : undefined),
    });

    if (p.isCancel(inputLocales)) {
      p.cancel("Operation cancelled.");
      return;
    }
    localesInput = inputLocales.trim();

    if (options.ai === undefined && options.noAi === undefined) {
      const confirmAi = await p.confirm({
        message: "Configure AI agent support (Claude/Cursor skills, .mcp.json, AGENTS.md)?",
        initialValue: true,
      });
      if (!p.isCancel(confirmAi)) {
        options.ai = confirmAi;
      }
    }
  } else {
    logger.info(`Auto-detected framework: ${pc.bold(framework)} (${detected.matchedRule})`);
  }

  const localeList = Array.from(
    new Set([
      defaultLocale,
      ...localesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ]),
  );

  // 1. AST generation or update for dialex.config.ts / i18n.config.ts via Magicast
  const configPath = fs.existsSync(path.join(root, "dialex.config.ts"))
    ? path.join(root, "dialex.config.ts")
    : fs.existsSync(path.join(root, "i18n.config.ts"))
      ? path.join(root, "i18n.config.ts")
      : path.join(root, "dialex.config.ts");
  const configFileName = path.basename(configPath);

  // React Router keeps its source in app/, so the generated file goes there
  const generatedOutput = framework === "react-router" ? "app/dialex.generated.ts" : undefined;

  try {
    if (fs.existsSync(configPath)) {
      const mod = await loadFile(configPath);
      if (mod && mod.exports.default) {
        if (mod.exports.default.$args && mod.exports.default.$args[0]) {
          mod.exports.default.$args[0].defaultLocale = defaultLocale;
          mod.exports.default.$args[0].locales = localeList;
          if (generatedOutput) mod.exports.default.$args[0].output = generatedOutput;
        }
        await writeFile(mod, configPath);
        logger.success(`Updated ${pc.bold(configFileName)} via Magicast`);
      }
    } else {
      const mod = parseModule(`import { defineConfig } from "dialexjs";

export default defineConfig({});
`);
      mod.exports.default.$args[0].defaultLocale = defaultLocale;
      mod.exports.default.$args[0].locales = localeList;
      if (generatedOutput) mod.exports.default.$args[0].output = generatedOutput;
      await writeFile(mod, configPath);
      logger.success(`Created ${pc.bold(configFileName)} via Magicast`);
    }
  } catch (err: any) {
    logger.warn(`Magicast config update notice: ${err.message || String(err)}`);
    // Fallback safe string write if AST parser encounters non-standard syntax
    const fallback = `import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "${defaultLocale}",
  locales: [${localeList.map((l) => `"${l}"`).join(", ")}],${
    generatedOutput ? `\n  output: "${generatedOutput}",` : ""
  }
});
`;
    fs.writeFileSync(configPath, fallback, "utf-8");
  }

  // 2. Nuxt reads the generated file through its module; other frameworks need no config edits
  if (framework === "nuxt") {
    const nuxtConfig = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"]
      .map((f) => path.join(root, f))
      .find((f) => fs.existsSync(f));
    if (nuxtConfig) {
      try {
        const nMod = await loadFile(nuxtConfig);
        addNuxtModule(nMod, "dialexjs/nuxt", "dialex", {});
        await writeFile(nMod, nuxtConfig);
        logger.success(
          `Registered dialexjs/nuxt in ${pc.bold(path.basename(nuxtConfig))} via Magicast`,
        );
      } catch {
        logger.warn("Could not update the Nuxt config; add the dialexjs/nuxt module manually.");
      }
    }
  }

  // 3. Create starter dictionary in src/ (or root)
  const targetDir =
    framework === "react-router" && fs.existsSync(path.join(root, "app"))
      ? path.join(root, "app")
      : fs.existsSync(path.join(root, "src"))
        ? path.join(root, "src")
        : root;
  const dictPath = path.join(targetDir, "home.content.ts");
  if (!fs.existsSync(dictPath)) {
    const dictRecords = localeList
      .map(
        (loc) => `  ${loc}: {
    title: "Welcome to Dialex (${loc})!",
    description: "Type-safe internationalization.",
    greeting: (name: string) => "Hello, " + name + "!",
  },`,
      )
      .join("\n");

    const dictContent = `import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
${dictRecords}
});
`;
    fs.writeFileSync(dictPath, dictContent, "utf-8");
    logger.success(`Created starter dictionary at ${pc.bold(path.relative(root, dictPath))}`);
  } else {
    logger.info("home.content.ts already exists, skipping creation.");
  }

  // 4. Run standalone dictionary generation immediately
  generateDictionaries(root);
  logger.success("Generated types and standalone dictionary registry!");

  // 5. Update package.json: required packages and the generate script
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const added = addRequiredPackages(pkg);
      pkg.scripts = pkg.scripts || {};
      const addScript = !pkg.scripts["dx:generate"];
      if (addScript) pkg.scripts["dx:generate"] = "dx generate";

      if (added.length > 0 || addScript) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      }
      if (added.length > 0) {
        logger.success(`Added ${added.join(" and ")} to package.json`);
        logger.info(`Run ${pc.bold(installCommand(root))} to install them.`);
      }
      if (addScript) logger.success('Added "dx:generate" script to package.json');
    } catch {
      logger.warn("Could not update package.json; add dialexjs and @dialexjs/cli manually.");
    }
  } else {
    logger.warn("No package.json found; install dialexjs and @dialexjs/cli in your project.");
  }

  // 6. AI Agent Integration (.agents/skills, .mcp.json, AGENTS.md)
  const shouldSetupAi =
    options.ai === true || (options.yes && options.ai !== false && options.noAi !== true);
  if (shouldSetupAi) {
    try {
      // 6a. Copy or create skill in .agents/skills/dialex/SKILL.md
      const skillDir = path.join(root, ".agents/skills/dialex");
      fs.mkdirSync(skillDir, { recursive: true });
      const skillContent = `---
name: dialex
description: Guide for internationalizing JavaScript and TypeScript apps with Dialex. Use when adding translations, creating content dictionaries, configuring locales, or using Dialex with frameworks like Next.js, React, Express, Hono, Fastify, SvelteKit, and Nuxt.
---

# Dialex Internationalization

Dialex is a high-performance, type-safe internationalization toolchain for JavaScript and TypeScript.

## Core Concepts
- Dictionaries are defined with \`defineDictionary("name", { ... })\` in \`*.content.ts\` files.
- Keys must match across all locales.
- ICU message syntax is supported for plurals and selects.
- Parity is validated at compile time with \`dialex check\`.

## Useful Commands
- \`dialex check --json\`: Check dictionary parity and references.
- \`dialex check --fix\`: Automatically insert missing keys marked with [TODO].
- \`dialex generate\`: Rebuild standalone dictionary bundle and types.
- \`dialex translate --locale <locale>\`: Automatically translate missing keys.
`;
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillContent, "utf-8");

      // 6b. Merge .mcp.json
      const mcpConfigPath = path.join(root, ".mcp.json");
      let mcpConfig: Record<string, any> = {};
      if (fs.existsSync(mcpConfigPath)) {
        try {
          mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
        } catch {
          mcpConfig = {};
        }
      }
      mcpConfig.mcpServers = mcpConfig.mcpServers || {};
      mcpConfig.mcpServers.dialex = mcpConfig.mcpServers.dialex || {
        command: "npx",
        args: ["@dialexjs/mcp"],
      };
      fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + "\n", "utf-8");

      // 6c. Add snippet to AGENTS.md if absent
      const agentsMdPath = path.join(root, "AGENTS.md");
      const dialexAgentSnippet = `
## Internationalization (Dialex)

This project uses [Dialex](https://github.com/awaiden/dialex) for type-safe internationalization.
- Dictionaries are in \`*.content.ts\` files using \`defineDictionary\`.
- Run \`dialex check --json\` to verify parity.
- Run \`dialex check --fix\` to insert missing keys marked with \`[TODO]\`.
- Run \`dx generate\` (alias of \`dialex\`) or \`npm run dx:generate\` to compile dictionary bundles and update types.
`;
      if (!fs.existsSync(agentsMdPath)) {
        fs.writeFileSync(agentsMdPath, dialexAgentSnippet.trimStart(), "utf-8");
      } else {
        const existing = fs.readFileSync(agentsMdPath, "utf-8");
        if (!existing.includes("Dialex")) {
          fs.writeFileSync(agentsMdPath, existing.trimEnd() + "\n" + dialexAgentSnippet, "utf-8");
        }
      }

      logger.success("Configured AI assistant support (.agents/skills, .mcp.json, AGENTS.md)");
    } catch (err: any) {
      logger.warn(`Could not finish AI configuration: ${err.message || String(err)}`);
    }
  }

  // 7. Framework-specific quickstart instructions
  logger.log("");
  logger.info(pc.bold(`Quick start for ${framework.toUpperCase()}:`));

  switch (framework) {
    case "hono":
      logger.log(`
import { Hono } from "hono";
import { dialexHono } from "dialexjs/hono";
import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title });
});
`);
      break;
    case "fastify":
      logger.log(`
import Fastify from "fastify";
import { dialexPlugin } from "dialexjs/fastify";
import { dialex } from "./src/dialex.generated.js";

const app = Fastify();
await app.register(dialexPlugin, { ...dialex });

app.get("/", (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title };
});
`);
      break;
    case "express":
      logger.log(`
import express from "express";
import { dialexExpress } from "dialexjs/express";
import { dialex } from "./src/dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title });
});
`);
      break;
    case "koa":
      logger.log(`
import Koa from "koa";
import { dialexKoa } from "dialexjs/koa";
import { dialex } from "./src/dialex.generated.js";

const app = new Koa();
app.use(dialexKoa({ ...dialex }));

app.use((ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title };
});
`);
      break;
    case "nestjs":
      logger.log(`
import { Module } from "@nestjs/common";
import { DialexModule } from "dialexjs/nestjs";
import { dialex } from "./src/dialex.generated.js";

@Module({
  imports: [DialexModule.forRoot({ ...dialex })],
})
export class AppModule {}
`);
      break;
    case "next":
      logger.log(`
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
`);
      break;
    case "react":
      logger.log(`
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
`);
      break;
    case "elysia":
      logger.log(`
import { Elysia } from "elysia";
import { dialexElysia } from "dialexjs/elysia";
import { dialex } from "./src/dialex.generated.js";

new Elysia()
  .use(dialexElysia({ ...dialex }))
  .get("/", ({ getDictionary }) => ({ title: getDictionary("home").title }))
  .listen(3000);
`);
      break;
    case "sveltekit":
      logger.log(`
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";
import { dialex } from "./dialex.generated.js";

export const handle = dialexHandle({ ...dialex });

// src/app.html: <html lang="%dialex.lang%">
// In load functions: locals.getDictionary("home")
`);
      break;
    case "astro":
      logger.log(`
// src/middleware.ts
import { dialexAstro } from "dialexjs/astro";
import { dialex } from "./dialex.generated.js";

export const onRequest = dialexAstro({ ...dialex });

// In pages: Astro.locals.getDictionary("home")
`);
      break;
    case "vue":
      logger.log(`
// src/main.ts
import { createApp } from "vue";
import { createDialex } from "dialexjs/vue";
import { dialex } from "./dialex.generated";
import App from "./App.vue";

createApp(App).use(createDialex({ ...dialex })).mount("#app");

// In components: const dict = useDictionary("home")
`);
      break;
    case "svelte":
      logger.log(`
<!-- src/App.svelte -->
<script lang="ts">
  import { provideDialex, useDictionary } from "dialexjs/svelte";
  import { dialex } from "./dialex.generated";

  const { locale, setLocale } = provideDialex({ ...dialex });
  const home = useDictionary("home");
</script>

<h1>{$home.title}</h1>
<button onclick={() => setLocale("tr")}>TR</button>
`);
      break;
    case "solid":
      logger.log(`
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
`);
      break;
    case "react-router":
      logger.log(`
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
`);
      break;
    case "preact":
      logger.log(`
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
`);
      break;
    case "qwik":
      logger.log(`
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
`);
      break;
    case "lit":
      logger.log(`
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
`);
      break;
    case "react-native":
      logger.log(`
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
`);
      break;
    case "hapi":
      logger.log(`
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
`);
      break;
    case "adonis":
      logger.log(`
// app/middleware/dialex_middleware.ts
import { createDialexMiddleware } from "dialexjs/adonis";
import { dialex } from "../dialex.generated.js";

export default createDialexMiddleware({ ...dialex });

// start/kernel.ts
router.use([() => import("#middleware/dialex_middleware")]);

// In handlers: ctx.locale, ctx.getDictionary("home")
`);
      break;
    case "trpc":
      logger.log(`
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
`);
      break;
    case "nuxt":
      logger.log(`
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["dialexjs/nuxt"],
});

// In components: const dict = useDictionary("home")
`);
      break;
    default:
      logger.log(`
Import dictionaries and register your framework middleware to begin!
Run \`npm run dx:generate\` whenever you add new dictionary files.
`);
      break;
  }

  logger.info(
    "Keep dialex.generated.ts current: run `dx generate --watch` while you develop, or use the Dialex VS Code extension, which regenerates on save.",
  );

  if (isInteractive) {
    p.outro(pc.green("✔ dialex is configured and ready to go!"));
  }
}
