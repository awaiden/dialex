import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, expect, it, beforeEach, afterEach } from "vite-plus/test";
import { detectFramework } from "../src/utils/detector.js";

describe("Framework detector", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-detector-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it("detects Next.js from dependencies", () => {
    const pkg = { dependencies: { next: "^15.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe("next");
    expect(result.confidence).toBe("high");
  });

  it("detects NestJS from @nestjs/core", () => {
    const pkg = { dependencies: { "@nestjs/core": "^11.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe("nestjs");
  });

  it("detects Fastify from fastify", () => {
    const pkg = { dependencies: { fastify: "^5.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe("fastify");
  });

  it("detects Koa from koa", () => {
    const pkg = { dependencies: { koa: "^3.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe("koa");
  });

  it("detects Express from express", () => {
    const pkg = { dependencies: { express: "^5.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe("express");
  });

  it("detects Hono from hono", () => {
    const pkg = { dependencies: { hono: "^4.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe("hono");
  });

  it("detects React/Vite from react and vite", () => {
    const pkg = { dependencies: { react: "^19.0.0" }, devDependencies: { vite: "^6.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe("react");
  });

  it("detects framework from config file presence when package.json has no deps", () => {
    fs.writeFileSync(path.join(tempDir, "next.config.mjs"), "export default {}", "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe("next");
    expect(result.confidence).toBe("medium");
  });

  it("detects Elysia from dependencies", () => {
    const pkg = { dependencies: { elysia: "^1.4.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    expect(detectFramework(tempDir).framework).toBe("elysia");
  });

  it("detects SvelteKit from dependencies", () => {
    const pkg = { dependencies: { "@sveltejs/kit": "^2.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    expect(detectFramework(tempDir).framework).toBe("sveltekit");
  });

  it("detects Astro from dependencies", () => {
    const pkg = { dependencies: { astro: "^5.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    expect(detectFramework(tempDir).framework).toBe("astro");
  });

  it("detects Nuxt from dependencies", () => {
    const pkg = { dependencies: { nuxt: "^4.0.0", vue: "^3.5.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    expect(detectFramework(tempDir).framework).toBe("nuxt");
  });

  it("detects Vue/Vite from dependencies", () => {
    const pkg = { dependencies: { vue: "^3.5.0", vite: "^6.0.0" } };
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(pkg), "utf-8");

    expect(detectFramework(tempDir).framework).toBe("vue");
  });

  it.each([
    ["nuxt.config.ts", "nuxt"],
    ["svelte.config.js", "sveltekit"],
    ["astro.config.mjs", "astro"],
  ])("detects framework from %s", (file, framework) => {
    fs.writeFileSync(path.join(tempDir, file), "export default {}", "utf-8");

    const result = detectFramework(tempDir);
    expect(result.framework).toBe(framework);
    expect(result.confidence).toBe("medium");
  });
});
