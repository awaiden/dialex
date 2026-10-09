import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { dialexPlugin, readDictionaryName } from "../src/vite.js";

const DICTIONARIES = "\0virtual:dialex-dictionaries";
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const project = (files: Record<string, string>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-vite-plugin-"));
  dirs.push(dir);
  for (const [rel, code] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), code);
  }
  return dir;
};

const resolve = async (dir: string, config: Record<string, unknown>) => {
  const plugin = dialexPlugin(config) as any;
  await plugin.configResolved({ root: dir });
  return plugin;
};

const home = `export default { name: "home", dictionary: { en: { title: "Welcome" }, tr: { title: "Selam" } } };\n`;
const nav = `export default { name: "nav", dictionary: { en: { about: "About" } } };\n`;

describe("readDictionaryName", () => {
  it("reads defineDictionary calls and name properties without executing", () => {
    expect(readDictionaryName('export default defineDictionary("home", {})')).toBe("home");
    expect(readDictionaryName("defineDictionary( 'a-b' ,{})")).toBe("a-b");
    expect(readDictionaryName('defineDictionary({ name: "auth", dictionary: {} })')).toBe("auth");
    expect(readDictionaryName('export default { name: "plain", dictionary: {} }')).toBe("plain");
    expect(readDictionaryName("export default compute()")).toBeUndefined();
  });
});

describe("virtual dictionaries module", () => {
  it("resolves the virtual ids", async () => {
    const plugin = await resolve(project({}), {});
    expect(plugin.resolveId("virtual:dialex-dictionaries")).toBe(DICTIONARIES);
    expect(plugin.resolveId("virtual:dialex-config")).toBe("\0virtual:dialex-config");
    expect(plugin.resolveId("something-else")).toBeUndefined();
  });

  it("eager mode globs dictionaries and exports the lazy flag", async () => {
    const plugin = await resolve(project({ "src/home.content.ts": home }), {});
    const code: string = plugin.load(DICTIONARIES);
    expect(code).toContain("import.meta.glob('**/*.content.ts', { eager: true })");
    expect(code).toContain("export const lazy = false;");
    expect(code).toContain("export function loadDictionary");
  });

  it("lazy mode emits one dynamic import per dictionary, keyed by name", async () => {
    const dir = project({ "src/home.content.ts": home, "src/nav.content.ts": nav });
    const plugin = await resolve(dir, { lazy: true });
    const code: string = plugin.load(DICTIONARIES);

    expect(code).toContain("export const lazy = true;");
    expect(code).not.toContain("import.meta.glob");
    expect(code).toContain(
      `"home": () => import(${JSON.stringify(path.join(dir, "src/home.content.ts"))})`,
    );
    expect(code).toContain('"nav": () =>');
  });

  it("the generated lazy module loads on demand and enforces configured locales", async () => {
    const dir = project({ "src/home.content.ts": home, "src/nav.content.ts": nav });
    const plugin = await resolve(dir, { lazy: true, locales: ["en", "tr"] });
    const file = path.join(dir, "virtual.mjs");
    fs.writeFileSync(file, plugin.load(DICTIONARIES));

    const mod = await import(/* @vite-ignore */ pathToFileURL(file).href);
    expect(mod.lazy).toBe(true);
    expect(mod.default.home).toBeUndefined();

    const loaded = await mod.loadDictionary("home");
    expect(loaded.tr.title).toBe("Selam");
    expect(mod.default.home).toBe(loaded);
    expect(mod.loadDictionary("home")).toBe(mod.loadDictionary("home")); // cached promise

    await expect(mod.loadDictionary("nav")).rejects.toThrow(/missing locale: "tr"/);
    expect(await mod.loadDictionary("unknown")).toBeUndefined();
  });

  it("fails clearly when a dictionary name cannot be read in lazy mode", async () => {
    const dir = project({ "src/odd.content.ts": "export default build();\n" });
    const plugin = await resolve(dir, { lazy: true });
    expect(() => plugin.load(DICTIONARIES)).toThrow(/Cannot determine the dictionary name/);
  });

  it("does not put translate settings into the client config", async () => {
    const plugin = await resolve(project({}), {
      defaultLocale: "en",
      translate: { provider: { name: "secret", translate: async () => [] } },
    } as any);
    const code: string = plugin.load("\0virtual:dialex-config");
    expect(code).toContain('"defaultLocale":"en"');
    expect(code).not.toContain("secret");
  });
});
