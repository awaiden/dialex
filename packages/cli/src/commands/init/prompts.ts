import * as p from "@clack/prompts";
import pc from "picocolors";

import type { DetectedFramework, SupportedFramework } from "../../utils/detector.js";
import type { InitOptions } from "./index.js";

/** The frameworks `dialex init` offers, in the order of the prompt: value and label. */
const FRAMEWORKS: [SupportedFramework, string][] = [
  ["hono", "Hono"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["koa", "Koa"],
  ["nestjs", "NestJS"],
  ["next", "Next.js"],
  ["react", "React / Vite"],
  ["elysia", "Elysia"],
  ["sveltekit", "SvelteKit"],
  ["astro", "Astro"],
  ["vue", "Vue / Vite"],
  ["nuxt", "Nuxt"],
  ["svelte", "Svelte / Vite"],
  ["solid", "Solid / Vite"],
  ["react-router", "React Router"],
  ["react-native", "React Native / Expo"],
  ["preact", "Preact / Vite"],
  ["qwik", "Qwik"],
  ["lit", "Lit / Web Components"],
  ["hapi", "Hapi"],
  ["adonis", "AdonisJS"],
  ["trpc", "tRPC"],
];

export interface InitAnswers {
  framework: SupportedFramework;
  defaultLocale: string;
  localesInput: string;
}

/**
 * Asks for the framework, the locales and (when not decided by a flag) AI support. Returns
 * `undefined` when the user cancels. May set `options.ai`.
 */
export async function askInit(
  options: InitOptions,
  detected: DetectedFramework,
): Promise<InitAnswers | undefined> {
  p.intro(pc.bgCyan(pc.black(" dialex init ")));

  const frameworkOptions = FRAMEWORKS.map(([value, label]) => ({
    value,
    label,
    hint: detected.framework === value ? "detected" : undefined,
  }));

  const selectedFramework = await p.select({
    message: `Framework detected as ${pc.bold(detected.framework)} (${detected.matchedRule}). Select framework:`,
    options: frameworkOptions,
    initialValue: detected.framework,
  });

  if (p.isCancel(selectedFramework)) {
    p.cancel("Operation cancelled.");
    return undefined;
  }
  const framework = selectedFramework as SupportedFramework;

  const inputDefault = await p.text({
    message: "What is your default locale?",
    initialValue: "en",
    validate: (v) => (!v || !v.trim() ? "Default locale cannot be empty" : undefined),
  });

  if (p.isCancel(inputDefault)) {
    p.cancel("Operation cancelled.");
    return undefined;
  }
  const defaultLocale = inputDefault.trim();

  const inputLocales = await p.text({
    message: "Comma-separated list of supported locales:",
    initialValue: `${defaultLocale},tr`,
    validate: (v) => (!v || !v.trim() ? "Locales list cannot be empty" : undefined),
  });

  if (p.isCancel(inputLocales)) {
    p.cancel("Operation cancelled.");
    return undefined;
  }
  const localesInput = inputLocales.trim();

  if (options.ai === undefined && options.noAi === undefined) {
    const confirmAi = await p.confirm({
      message: "Configure AI agent support (Claude/Cursor skills, .mcp.json, AGENTS.md)?",
      initialValue: true,
    });
    if (!p.isCancel(confirmAi)) {
      options.ai = confirmAi;
    }
  }

  return { framework, defaultLocale, localesInput };
}
