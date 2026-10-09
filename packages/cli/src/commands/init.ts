import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { parseModule, loadFile, writeFile } from "magicast";
import { addNuxtModule } from "magicast/helpers";
import { generateDictionaries } from "./generate.js";
import { detectFramework, type SupportedFramework } from "../utils/detector.js";
import { logger } from "../utils/logger.js";
import { addRequiredPackages, installCommand } from "../utils/package-json.js";

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

  try {
    if (fs.existsSync(configPath)) {
      const mod = await loadFile(configPath);
      if (mod && mod.exports.default) {
        if (mod.exports.default.$args && mod.exports.default.$args[0]) {
          mod.exports.default.$args[0].defaultLocale = defaultLocale;
          mod.exports.default.$args[0].locales = localeList;
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
      await writeFile(mod, configPath);
      logger.success(`Created ${pc.bold(configFileName)} via Magicast`);
    }
  } catch (err: any) {
    logger.warn(`Magicast config update notice: ${err.message || String(err)}`);
    // Fallback safe string write if AST parser encounters non-standard syntax
    const fallback = `import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "${defaultLocale}",
  locales: [${localeList.map((l) => `"${l}"`).join(", ")}],
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
  const targetDir = fs.existsSync(path.join(root, "src")) ? path.join(root, "src") : root;
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
import { dialex } from "dialexjs/hono";
import dictionaries from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialex({ dictionaries }));

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
import dictionaries from "./src/dialex.generated.js";

const app = Fastify();
await app.register(dialexPlugin, { dictionaries });

app.get("/", (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title };
});
`);
      break;
    case "express":
      logger.log(`
import express from "express";
import { dialex } from "dialexjs/express";
import dictionaries from "./src/dialex.generated.js";

const app = express();
app.use(dialex({ dictionaries }));

app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title });
});
`);
      break;
    case "koa":
      logger.log(`
import Koa from "koa";
import { dialex } from "dialexjs/koa";
import dictionaries from "./src/dialex.generated.js";

const app = new Koa();
app.use(dialex({ dictionaries }));

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
import dictionaries from "./src/dialex.generated.js";

@Module({
  imports: [DialexModule.forRoot({ dictionaries })],
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
import { dialex } from "dialexjs/elysia";
import dictionaries from "./src/dialex.generated.js";

new Elysia()
  .use(dialex({ dictionaries }))
  .get("/", ({ getDictionary }) => ({ title: getDictionary("home").title }))
  .listen(3000);
`);
      break;
    case "sveltekit":
      logger.log(`
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";
import dictionaries from "./dialex.generated.js";

export const handle = dialexHandle({ dictionaries });

// src/app.html: <html lang="%dialex.lang%">
// In load functions: locals.getDictionary("home")
`);
      break;
    case "astro":
      logger.log(`
// src/middleware.ts
import { dialex } from "dialexjs/astro";
import dictionaries from "./dialex.generated.js";

export const onRequest = dialex({ dictionaries });

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
