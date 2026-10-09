import { describe, expect, it, vi } from "vite-plus/test";

const calls: Record<string, any[]> = { addVitePlugin: [], addPluginTemplate: [], addImports: [] };

vi.mock("@nuxt/kit", () => ({
  defineNuxtModule: (def: any) => def,
  addVitePlugin: (...args: any[]) => calls.addVitePlugin.push(args),
  addPluginTemplate: (...args: any[]) => calls.addPluginTemplate.push(args),
  addImports: (...args: any[]) => calls.addImports.push(args),
}));

const { default: nuxtModule } = await import("../src/nuxt.js");

describe("Nuxt module", () => {
  it("registers the Vite plugin, plugin template, and auto-imports", () => {
    (nuxtModule as any).setup({ defaultLocale: "tr", locales: ["en", "tr"], cookieName: "lng" });

    expect(calls.addVitePlugin).toHaveLength(1);
    expect(calls.addVitePlugin[0][0].name).toBe("vite-plugin-dialex");

    const template = calls.addPluginTemplate[0][0];
    expect(template.filename).toBe("dialex.plugin.mjs");
    const contents = template.getContents();
    expect(contents).toContain('useCookie("lng"');
    expect(contents).toContain('"tr"');
    expect(contents).toContain('from "dialexjs/vue"');

    expect(calls.addImports[0][0].map((i: any) => i.name)).toEqual(["useDialex", "useDictionary"]);
  });

  it("declares the module meta and defaults", () => {
    expect((nuxtModule as any).meta).toEqual({ name: "dialex", configKey: "dialex" });
    expect((nuxtModule as any).defaults).toEqual({ defaultLocale: "en", cookieName: "locale" });
  });
});
