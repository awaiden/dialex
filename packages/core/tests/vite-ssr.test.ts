import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { dialexPlugin } from "../src/vite.js";

const dirs: string[] = [];
const servers: ViteDevServer[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const dict = (name: string, en: string, tr?: string) =>
  `export default { name: "${name}", dictionary: { en: { title: "${en}" }${
    tr ? `, tr: { title: "${tr}" }` : ""
  } } };\n`;

function project(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-vite-ssr-"));
  dirs.push(dir);
  for (const [rel, code] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), code);
  }
  return dir;
}

async function start(root: string, pluginConfig: Record<string, unknown> = {}, extra = {}) {
  const server = await createServer({
    root,
    configFile: false,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true, watch: { usePolling: false } },
    plugins: [dialexPlugin(pluginConfig)],
    ...extra,
  });
  servers.push(server);
  return server;
}

const names = async (server: ViteDevServer) => {
  const mod = await server.ssrLoadModule("virtual:dialex-dictionaries");
  return Object.keys(mod.default as object).sort();
};

const BASE = {
  "src/home.content.ts": dict("home", "Welcome", "Selam"),
  "src/nav.content.ts": dict("nav", "About", "Hakkında"),
};

describe("dictionaries in a real Vite SSR server", () => {
  it.each([
    ["the default include", undefined],
    ["a relative include", "src/**/*.content.ts"],
    ["an include with a leading slash, the form Vite globs need", "/src/**/*.content.ts"],
  ])("loads every dictionary with %s", async (_label, include) => {
    const root = project(BASE);
    const server = await start(root, include ? { include } : {});
    expect(await names(server)).toEqual(["home", "nav"]);
  });

  it("ignores dictionary files inside node_modules and build output", async () => {
    const root = project({
      ...BASE,
      "node_modules/dep/x.content.ts": dict("dep", "no"),
      "dist/old.content.ts": dict("old", "no"),
      ".next/cache/y.content.ts": dict("next", "no"),
    });
    const server = await start(root);
    expect(await names(server)).toEqual(["home", "nav"]);
  });

  it("still enforces the configured locales", async () => {
    const root = project({ "src/home.content.ts": dict("home", "Welcome") });
    const server = await start(root, { locales: ["en", "tr"] });
    await expect(server.ssrLoadModule("virtual:dialex-dictionaries")).rejects.toThrow(
      /missing locale: "tr"/,
    );
  });

  it("picks up a dictionary added while the server runs", async () => {
    const root = project(BASE);
    const server = await start(root);
    expect(await names(server)).toEqual(["home", "nav"]);

    const added = path.join(root, "src/extra.content.ts");
    fs.writeFileSync(added, dict("extra", "More"));
    server.watcher.emit("add", added);

    expect(await names(server)).toEqual(["extra", "home", "nav"]);
  });
});

describe("a package that imports the virtual modules", () => {
  // Stands in for `dialexjs/react`: an installed package, so Vite would normally hand it to Node,
  // which cannot load a `virtual:` import.
  const fakeDialexjs = {
    "node_modules/dialexjs/package.json": JSON.stringify({
      name: "dialexjs",
      version: "0.0.0",
      type: "module",
      exports: { ".": "./index.mjs" },
    }),
    "node_modules/dialexjs/index.mjs": `
      import dictionaries from "virtual:dialex-dictionaries";
      import config from "virtual:dialex-config";
      export const seen = { names: Object.keys(dictionaries), locale: config.defaultLocale };
    `,
  };

  it("renders in SSR without the user setting ssr.noExternal", async () => {
    const root = project({ ...BASE, ...fakeDialexjs });
    const server = await start(root, { defaultLocale: "tr" });
    const mod = await server.ssrLoadModule("dialexjs");
    expect(mod.seen).toEqual({ names: ["home", "nav"], locale: "tr" });
  });

  it("configures ssr.noExternal and optimizeDeps.exclude, keeping the user's entries", async () => {
    const root = project(BASE);
    const server = await start(
      root,
      {},
      { ssr: { noExternal: ["my-ui-kit"] }, optimizeDeps: { exclude: ["other"] } },
    );
    const { ssr, optimizeDeps } = server.config;
    expect(ssr.noExternal).toEqual(expect.arrayContaining(["dialexjs", "my-ui-kit"]));
    expect(optimizeDeps.exclude).toEqual(expect.arrayContaining(["dialexjs", "other"]));
  });

  it("leaves ssr.noExternal: true alone", async () => {
    const root = project(BASE);
    const server = await start(root, {}, { ssr: { noExternal: true } });
    expect(server.config.ssr.noExternal).toBe(true);
  });
});
