import * as p from "@clack/prompts";
import pc from "picocolors";

import { detectFramework, type SupportedFramework } from "../../utils/detector.js";
import { logger } from "../../utils/logger.js";
import { generateDictionaries } from "../generate/index.js";
import { setupAiSupport } from "./ai-setup.js";
import { registerNuxtModule, writeDialexConfig } from "./config-file.js";
import { updatePackageJson } from "./dependencies.js";
import { askInit } from "./prompts.js";
import { printQuickstart } from "./quickstart.js";
import { createStarterDictionary } from "./starter-dictionary.js";

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
    const answers = await askInit(options, detected);
    if (!answers) return;
    ({ framework, defaultLocale, localesInput } = answers);
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

  // 1. dialex.config.ts (or i18n.config.ts) through Magicast
  await writeDialexConfig(root, framework, defaultLocale, localeList);

  // 2. Nuxt reads the generated file through its module; other frameworks need no config edits
  if (framework === "nuxt") await registerNuxtModule(root);

  // 3. Starter dictionary in src/ (or app/, or the root)
  createStarterDictionary(root, framework, localeList);

  // 4. Run standalone dictionary generation immediately
  // The config was just written as literals; reading it statically does not need `dialexjs`
  // installed yet, which it is not on a fresh project.
  generateDictionaries(root, { static: true });
  logger.success("Generated types and standalone dictionary registry!");

  // 5. package.json: required packages and the generate script
  updatePackageJson(root);

  // 6. AI agent integration (.agents/skills, .mcp.json, AGENTS.md)
  const shouldSetupAi =
    options.ai === true || (options.yes && options.ai !== false && options.noAi !== true);
  if (shouldSetupAi) setupAiSupport(root);

  // 7. Framework-specific quickstart
  printQuickstart(framework);

  logger.info(
    "Keep dialex.generated.ts current: run `dx generate --watch` while you develop, or use the Dialex VS Code extension, which regenerates on save.",
  );

  if (isInteractive) {
    p.outro(pc.green("✔ dialex is configured and ready to go!"));
  }
}
