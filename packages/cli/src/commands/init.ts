import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { parseModule, loadFile, writeFile } from "magicast";
import { addNuxtModule, addVitePlugin } from "magicast/helpers";
import { generateDictionaries } from "./generate.js";
import { detectFramework, type SupportedFramework } from "../utils/detector.js";
import { logger } from "../utils/logger.js";

export interface InitOptions {
  cwd?: string;
  framework?: string;
  defaultLocale?: string;
  locales?: string;
  yes?: boolean;
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

  // 2. Magicast AST injection for Vite and Nuxt projects
  if (framework === "react" || framework === "vue") {
    const possibleViteConfigs = [
      path.join(root, "vite.config.ts"),
      path.join(root, "vite.config.js"),
      path.join(root, "vite.config.mjs"),
    ];
    for (const vConfig of possibleViteConfigs) {
      if (fs.existsSync(vConfig)) {
        try {
          const vMod = await loadFile(vConfig);
          addVitePlugin(vMod, {
            from: "dialexjs/vite",
            imported: "i18nPlugin",
            constructor: "i18nPlugin",
          });
          await writeFile(vMod, vConfig);
          logger.success(
            `Injected i18nPlugin() into ${pc.bold(path.basename(vConfig))} via Magicast`,
          );
          break;
        } catch {
          // If already added or non-standard, continue
        }
      }
    }
  }

  if (framework === "nuxt") {
    const nuxtConfig = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"]
      .map((f) => path.join(root, f))
      .find((f) => fs.existsSync(f));
    if (nuxtConfig) {
      try {
        const nMod = await loadFile(nuxtConfig);
        addNuxtModule(nMod, "dialexjs/nuxt", "dialex", {
          defaultLocale,
          locales: localeList,
        });
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

  // 5. Update package.json scripts
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts["i18n:generate"]) {
        pkg.scripts["i18n:generate"] = "dialex generate";
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
        logger.success('Added "i18n:generate" script to package.json');
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 6. Framework-specific quickstart instructions
  logger.log("");
  logger.info(pc.bold(`Quick start for ${framework.toUpperCase()}:`));

  switch (framework) {
    case "hono":
      logger.log(`
import { Hono } from "hono";
import { i18n } from "dialexjs/hono";
import dictionaries from "./src/i18n.generated.js";

const app = new Hono();
app.use("*", i18n({ dictionaries }));

app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title });
});
`);
      break;
    case "fastify":
      logger.log(`
import Fastify from "fastify";
import { i18nPlugin } from "dialexjs/fastify";
import dictionaries from "./src/i18n.generated.js";

const app = Fastify();
await app.register(i18nPlugin, { dictionaries });

app.get("/", (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title };
});
`);
      break;
    case "express":
      logger.log(`
import express from "express";
import { i18n } from "dialexjs/express";
import dictionaries from "./src/i18n.generated.js";

const app = express();
app.use(i18n({ dictionaries }));

app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title });
});
`);
      break;
    case "koa":
      logger.log(`
import Koa from "koa";
import { i18n } from "dialexjs/koa";
import dictionaries from "./src/i18n.generated.js";

const app = new Koa();
app.use(i18n({ dictionaries }));

app.use((ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title };
});
`);
      break;
    case "nestjs":
      logger.log(`
import { Module } from "@nestjs/common";
import { I18nModule } from "dialexjs/nestjs";
import dictionaries from "./src/i18n.generated.js";

@Module({
  imports: [I18nModule.forRoot({ dictionaries })],
})
export class AppModule {}
`);
      break;
    case "next":
      logger.log(`
import { getDictionary } from "dialexjs/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale = "en" } = await params;
  const dict = getDictionary("home", locale);
  return <h1>{dict.title}</h1>;
}
`);
      break;
    case "elysia":
      logger.log(`
import { Elysia } from "elysia";
import { i18n } from "dialexjs/elysia";
import dictionaries from "./src/i18n.generated.js";

new Elysia()
  .use(i18n({ dictionaries }))
  .get("/", ({ getDictionary }) => ({ title: getDictionary("home").title }))
  .listen(3000);
`);
      break;
    case "sveltekit":
      logger.log(`
// src/hooks.server.ts
import { i18nHandle } from "dialexjs/sveltekit";
import dictionaries from "./i18n.generated.js";

export const handle = i18nHandle({ dictionaries });

// src/app.html: <html lang="%dialex.lang%">
// In load functions: locals.getDictionary("home")
`);
      break;
    case "astro":
      logger.log(`
// src/middleware.ts
import { i18n } from "dialexjs/astro";
import dictionaries from "./i18n.generated.js";

export const onRequest = i18n({ dictionaries });

// In pages: Astro.locals.getDictionary("home")
`);
      break;
    case "vue":
      logger.log(`
// src/main.ts
import { createApp } from "vue";
import { createI18n } from "dialexjs/vue";
import App from "./App.vue";

createApp(App).use(createI18n()).mount("#app");

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
Run \`npm run i18n:generate\` whenever you add new dictionary files.
`);
      break;
  }

  if (isInteractive) {
    p.outro(pc.green("✔ dialex is configured and ready to go!"));
  }
}
