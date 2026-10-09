import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, expect, it, afterEach } from "vite-plus/test";
import { runInit } from "../src/commands/init.js";

describe("CLI init command", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-init-test-"));

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it("auto-detects Fastify from package.json and initializes project", async () => {
    fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(
        {
          name: "test-fastify-app",
          dependencies: { fastify: "^5.0.0" },
          scripts: {},
        },
        null,
        2,
      ),
      "utf-8",
    );

    await runInit({
      cwd: tempDir,
      defaultLocale: "en",
      locales: "en,tr",
      yes: true,
    });

    expect(fs.existsSync(path.join(tempDir, "dialex.config.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "src/home.content.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "src/dialex.generated.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "src/dialex-env.d.ts"))).toBe(true);

    const configContent = fs.readFileSync(path.join(tempDir, "dialex.config.ts"), "utf-8");
    expect(configContent).toContain('defaultLocale: "en"');
    expect(configContent).toContain('"tr"');

    const pkg = JSON.parse(fs.readFileSync(path.join(tempDir, "package.json"), "utf-8"));
    expect(pkg.scripts["dx:generate"]).toBe("dx generate");
    expect(pkg.dependencies.dialexjs).toMatch(/^\^\d+\.\d+\.\d+/);
    expect(pkg.dependencies.fastify).toBe("^5.0.0");
    expect(pkg.devDependencies["@dialexjs/cli"]).toBe(pkg.dependencies.dialexjs);

    expect(fs.existsSync(path.join(tempDir, ".agents/skills/dialex/SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, ".mcp.json"))).toBe(true);
    const mcp = JSON.parse(fs.readFileSync(path.join(tempDir, ".mcp.json"), "utf-8"));
    expect(mcp.mcpServers.dialex).toBeDefined();
    expect(fs.existsSync(path.join(tempDir, "AGENTS.md"))).toBe(true);
    expect(fs.readFileSync(path.join(tempDir, "AGENTS.md"), "utf-8")).toContain("Dialex");
  });

  it.each([
    ["react", { react: "^19.0.0", vite: "^6.0.0" }],
    ["vue", { vue: "^3.5.0", vite: "^6.0.0" }],
  ])("leaves vite.config.ts alone for %s: there is no plugin to add", async (_name, deps) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-vite-test-"));
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "x", dependencies: deps }),
    );
    const viteConfig =
      "import { defineConfig } from 'vite';\nexport default defineConfig({ plugins: [] });\n";
    fs.writeFileSync(path.join(dir, "vite.config.ts"), viteConfig);

    await runInit({ cwd: dir, yes: true });

    expect(fs.readFileSync(path.join(dir, "vite.config.ts"), "utf-8")).toBe(viteConfig);
    expect(fs.existsSync(path.join(dir, "src/dialex.generated.ts"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each([
    ["react", { react: "^19.0.0" }],
    ["vue", { vue: "^3.5.0" }],
    ["next", { next: "^15.0.0", react: "^19.0.0" }],
    ["nuxt", { nuxt: "^4.0.0" }],
    ["sveltekit", { "@sveltejs/kit": "^2.0.0" }],
    ["astro", { astro: "^5.0.0" }],
    ["hono", { hono: "^4.0.0" }],
    ["express", { express: "^5.0.0" }],
    ["fastify", { fastify: "^5.0.0" }],
    ["koa", { koa: "^3.0.0" }],
    ["nestjs", { "@nestjs/core": "^11.0.0" }],
    ["elysia", { elysia: "^1.0.0" }],
    [undefined, {}],
  ])("creates dialex.config.ts for %s", async (framework, deps) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-config-test-"));
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "x", dependencies: deps }),
    );

    await runInit({ cwd: dir, yes: true, framework, defaultLocale: "tr", locales: "tr,en" });

    const config = fs.readFileSync(path.join(dir, "dialex.config.ts"), "utf-8");
    expect(config).toContain('defaultLocale: "tr"');
    expect(config).toContain('"en"');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("creates dialex.config.ts with --ai too", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-config-ai-"));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x" }));
    await runInit({ cwd: dir, yes: true, ai: true });
    expect(fs.existsSync(path.join(dir, "dialex.config.ts"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("registers the dialexjs/nuxt module in nuxt.config.ts", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-nuxt-test-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "nuxt-app", dependencies: { nuxt: "^4.0.0" } }),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(dir, "nuxt.config.ts"),
      "export default defineNuxtConfig({});\n",
      "utf-8",
    );

    await runInit({ cwd: dir, defaultLocale: "en", locales: "en,tr", yes: true });

    const config = fs.readFileSync(path.join(dir, "nuxt.config.ts"), "utf-8");
    expect(config).toContain("dialexjs/nuxt");
    expect(config).not.toContain("defaultLocale"); // locales come from dialex.config.ts now
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("keeps packages the project already lists as they are, and sorts the object it adds to", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-pkgs-test-"));
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "x",
        dependencies: { zod: "^4.0.0", hono: "^4.0.0", dialexjs: "0.1.0" },
        devDependencies: { typescript: "^5.0.0" },
      }),
      "utf-8",
    );

    await runInit({ cwd: dir, defaultLocale: "en", locales: "en", yes: true, noAi: true });

    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
    expect(pkg.dependencies.dialexjs).toBe("0.1.0");
    expect(Object.keys(pkg.dependencies)).toEqual(["zod", "hono", "dialexjs"]); // untouched
    expect(Object.keys(pkg.devDependencies)).toEqual(["@dialexjs/cli", "typescript"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
