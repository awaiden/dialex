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
  | "nuxt";

export interface DetectedFramework {
  framework: SupportedFramework;
  confidence: "high" | "medium" | "fallback";
  matchedRule: string;
}

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

      if ("nuxt" in allDeps) {
        return {
          framework: "nuxt",
          confidence: "high",
          matchedRule: "package.json dependencies (nuxt)",
        };
      }
      if ("@sveltejs/kit" in allDeps) {
        return {
          framework: "sveltekit",
          confidence: "high",
          matchedRule: "package.json dependencies (@sveltejs/kit)",
        };
      }
      if ("astro" in allDeps) {
        return {
          framework: "astro",
          confidence: "high",
          matchedRule: "package.json dependencies (astro)",
        };
      }
      if ("next" in allDeps) {
        return {
          framework: "next",
          confidence: "high",
          matchedRule: "package.json dependencies (next)",
        };
      }
      if ("@nestjs/core" in allDeps || "@nestjs/common" in allDeps) {
        return {
          framework: "nestjs",
          confidence: "high",
          matchedRule: "package.json dependencies (@nestjs/core)",
        };
      }
      if ("fastify" in allDeps) {
        return {
          framework: "fastify",
          confidence: "high",
          matchedRule: "package.json dependencies (fastify)",
        };
      }
      if ("koa" in allDeps) {
        return {
          framework: "koa",
          confidence: "high",
          matchedRule: "package.json dependencies (koa)",
        };
      }
      if ("express" in allDeps) {
        return {
          framework: "express",
          confidence: "high",
          matchedRule: "package.json dependencies (express)",
        };
      }
      if ("elysia" in allDeps) {
        return {
          framework: "elysia",
          confidence: "high",
          matchedRule: "package.json dependencies (elysia)",
        };
      }
      if ("hono" in allDeps) {
        return {
          framework: "hono",
          confidence: "high",
          matchedRule: "package.json dependencies (hono)",
        };
      }
      if ("vue" in allDeps && !("react" in allDeps)) {
        return {
          framework: "vue",
          confidence: "high",
          matchedRule: "package.json dependencies (vue)",
        };
      }
      if ("react" in allDeps || "vite" in allDeps) {
        return {
          framework: "react",
          confidence: "high",
          matchedRule: "package.json dependencies (react/vite)",
        };
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Check filesystem configurations
  if (
    fs.existsSync(path.join(root, "next.config.js")) ||
    fs.existsSync(path.join(root, "next.config.mjs")) ||
    fs.existsSync(path.join(root, "next.config.ts"))
  ) {
    return {
      framework: "next",
      confidence: "medium",
      matchedRule: "next.config file presence",
    };
  }

  const configRules: [SupportedFramework, string][] = [
    ["nuxt", "nuxt.config"],
    ["sveltekit", "svelte.config"],
    ["astro", "astro.config"],
  ];
  for (const [framework, base] of configRules) {
    if (["js", "mjs", "ts"].some((ext) => fs.existsSync(path.join(root, `${base}.${ext}`)))) {
      return { framework, confidence: "medium", matchedRule: `${base} file presence` };
    }
  }

  if (
    fs.existsSync(path.join(root, "vite.config.js")) ||
    fs.existsSync(path.join(root, "vite.config.mjs")) ||
    fs.existsSync(path.join(root, "vite.config.ts"))
  ) {
    return {
      framework: "react",
      confidence: "medium",
      matchedRule: "vite.config file presence",
    };
  }

  return {
    framework: "hono",
    confidence: "fallback",
    matchedRule: "default fallback",
  };
}
