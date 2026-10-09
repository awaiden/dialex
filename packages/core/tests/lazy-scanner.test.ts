import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

// The factory runs the first time `scanner.js` is imported, so the counter shows when that happens.
const loaded = vi.hoisted(() => ({ count: 0, scans: 0 }));
vi.mock("../src/scanner.js", () => {
  loaded.count++;
  return {
    autoScanAndLoadDictionaries: async () => {
      loaded.scans++;
      return {};
    },
    generateDts: () => {},
  };
});

const dict = { name: "home", dictionary: { en: { title: "Welcome" } } };
const options = { defaultLocale: "en", locales: ["en"] };

describe("the project scanner is only loaded when an adapter needs it", () => {
  beforeEach(() => {
    vi.resetModules();
    loaded.count = 0;
    loaded.scans = 0;
  });

  it("is never imported by the web adapter when dictionaries are passed", async () => {
    const { createDialexHandler } = await import("../src/web.js");
    const resolve = createDialexHandler({ ...options, dictionaries: [dict] });
    await resolve(new Request("http://localhost/"));
    expect(loaded.count).toBe(0);
  });

  it("is never imported by the other adapters when dictionaries are passed", async () => {
    const { dialex: hono } = await import("../src/hono.js");
    const { dialex: express } = await import("../src/express.js");
    const { dialex: koa } = await import("../src/koa.js");
    hono({ ...options, dictionaries: [dict] });
    express({ ...options, dictionaries: [dict] });
    koa({ ...options, dictionaries: [dict] });
    expect(loaded.count).toBe(0);
  });

  it("is loaded and used when no dictionaries are passed", async () => {
    const { createDialexHandler } = await import("../src/web.js");
    const resolve = createDialexHandler(options);
    await resolve(new Request("http://localhost/"));
    expect(loaded.count).toBe(1);
    expect(loaded.scans).toBe(1);
  });
});
