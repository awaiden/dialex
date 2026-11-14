import fs from "node:fs";
import path from "node:path";

export type SupportedFramework =
  | "next"
  | "react"
  | "hono"
  | "express"
  | "fastify"
  | "koa"
  | "nestjs"
  | "elysia"
  | "sveltekit"
  | "astro"
  | "vue"
  | "nuxt"
  | "svelte"
  | "solid"
  | "react-router"
  | "preact"
  | "qwik"
  | "lit"
  | "react-native"
  | "hapi"
  | "adonis"
  | "trpc";

export interface DetectedFramework {
  framework: SupportedFramework;
  confidence: "high" | "medium" | "fallback";
  matchedRule: string;
}

interface DependencyRule {
  framework: SupportedFramework;
  deps: readonly string[];
  exclude?: readonly string[];
  label?: string;
}

const DEPENDENCY_RULES: readonly DependencyRule[] = [
  { framework: "nuxt", deps: ["nuxt"] },
  { framework: "sveltekit", deps: ["@sveltejs/kit"] },
  { framework: "astro", deps: ["astro"] },
  { framework: "next", deps: ["next"] },
  { framework: "nestjs", deps: ["@nestjs/core", "@nestjs/common"], label: "@nestjs/core" },
  { framework: "adonis", deps: ["@adonisjs/core"] },
  { framework: "hapi", deps: ["@hapi/hapi"] },
  { framework: "fastify", deps: ["fastify"] },
  { framework: "koa", deps: ["koa"] },
  { framework: "express", deps: ["express"] },
  { framework: "elysia", deps: ["elysia"] },
  { framework: "hono", deps: ["hono"] },
  { framework: "trpc", deps: ["@trpc/server"] },
  { framework: "qwik", deps: ["@builder.io/qwik"] },
  { framework: "react-native", deps: ["react-native", "expo"], label: "react-native/expo" },
  { framework: "react-router", deps: ["@react-router/dev"] },
  { framework: "solid", deps: ["solid-js"] },
  { framework: "svelte", deps: ["svelte"] },
  { framework: "vue", deps: ["vue"], exclude: ["react"] },
  { framework: "preact", deps: ["preact"] },
  { framework: "lit", deps: ["lit"], exclude: ["react"] },
  { framework: "react", deps: ["react", "vite"], label: "react/vite" },
];

const CONFIG_RULES: readonly [SupportedFramework, string][] = [
  ["next", "next.config"],
  ["nuxt", "nuxt.config"],
  ["sveltekit", "svelte.config"],
  ["astro", "astro.config"],
  ["react-router", "react-router.config"],
  ["react", "vite.config"],
];

/**
 * Automatically inspects package.json dependencies and configuration files
 * to detect the active framework in the target project.
 */
export function detectFramework(root: string): DetectedFramework {
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      for (const rule of DEPENDENCY_RULES) {
        if (
          rule.deps.some((dep) => dep in allDeps) &&
          !rule.exclude?.some((dep) => dep in allDeps)
        ) {
          return {
            framework: rule.framework,
            confidence: "high",
            matchedRule: `package.json dependencies (${rule.label ?? rule.deps[0]})`,
          };
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  for (const [framework, base] of CONFIG_RULES) {
    if (["js", "mjs", "ts"].some((ext) => fs.existsSync(path.join(root, `${base}.${ext}`)))) {
      return { framework, confidence: "medium", matchedRule: `${base} file presence` };
    }
  }

  return {
    framework: "hono",
    confidence: "fallback",
    matchedRule: "default fallback",
  };
}
