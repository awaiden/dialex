import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const calls: Record<string, any[]> = { addPluginTemplate: [], addImports: [] };

vi.mock("@nuxt/kit", () => ({
  defineNuxtModule: (def: any) => def,
  addPluginTemplate: (...args: any[]) => calls.addPluginTemplate.push(args),
  addImports: (...args: any[]) => calls.addImports.push(args),
}));

const { default: nuxtModule } = await import("../src/nuxt.js");

const dirs: string[] = [];
afterEach(() => {
  calls.addPluginTemplate.length = 0;
  calls.addImports.length = 0;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function project(generatedAt?: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-nuxt-"));
  dirs.push(dir);
  if (generatedAt) {
    fs.mkdirSync(path.dirname(path.join(dir, generatedAt)), { recursive: true });
    fs.writeFileSync(path.join(dir, generatedAt), "export const dialex = {};\n");
  }
  return { rootDir: dir, srcDir: path.join(dir, "app") };
}

const setup = (options: Record<string, unknown>, nuxt: { rootDir: string; srcDir: string }) =>
  (nuxtModule as any).setup(options, { options: nuxt });

describe("Nuxt module", () => {
  it("registers the plugin template and auto-imports, using the generated file", () => {
    const nuxt = project("app/dialex.generated.ts");
    setup({ cookieName: "lng" }, nuxt);

    const template = calls.addPluginTemplate[0][0];
    expect(template.filename).toBe("dialex.plugin.mjs");
    const contents = template.getContents();
    expect(contents).toContain('useCookie("lng"');
    expect(contents).toContain('from "dialexjs/vue"');
    expect(contents).toContain("...dialex");
    expect(contents).toContain(`${nuxt.srcDir.replace(/\\/g, "/")}/dialex.generated`);
    expect(contents).not.toContain(".ts");

    expect(calls.addImports[0][0].map((i: any) => i.name)).toEqual(["useDialex", "useDictionary"]);
  });

  it("finds the generated file in the project root or src/ too", () => {
    for (const where of ["dialex.generated.ts", "src/dialex.generated.ts"]) {
      calls.addPluginTemplate.length = 0;
      setup({}, project(where));
      expect(calls.addPluginTemplate).toHaveLength(1);
    }
  });

  it("takes a custom path", () => {
    const nuxt = project("custom/gen.ts");
    setup({ generated: "custom/gen" }, nuxt);
    expect(calls.addPluginTemplate[0][0].getContents()).toContain("custom/gen");
  });

  it("explains how to create the generated file when it is missing", () => {
    expect(() => setup({}, project())).toThrow(/Run `dx generate`/);
  });

  it("declares the module meta and defaults", () => {
    expect((nuxtModule as any).meta).toEqual({ name: "dialex", configKey: "dialex" });
    expect((nuxtModule as any).defaults).toEqual({ cookieName: "locale" });
  });
});
