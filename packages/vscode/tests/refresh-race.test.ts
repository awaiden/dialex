import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { HOME, cleanup, writeProject } from "./helpers.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const { analyzeQueue, realAnalyzeRef } = vi.hoisted(() => ({
  analyzeQueue: [] as {
    promise: Promise<any>;
    resolve: (v: any) => void;
    reject: (e: unknown) => void;
  }[],
  realAnalyzeRef: { current: undefined as ((opts: any) => Promise<any>) | undefined },
}));

vi.mock("vscode", async () => await import("./fake-vscode.js"));
vi.mock("@dialexjs/cli/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dialexjs/cli/api")>();
  realAnalyzeRef.current = actual.analyzeProject;
  return {
    ...actual,
    analyzeProject: vi.fn(async (opts: any) => {
      const next = analyzeQueue.shift();
      if (next) return await next.promise;
      return await actual.analyzeProject(opts);
    }),
  };
});

import { activate } from "../src/extension.js";
import * as fake from "./fake-vscode.js";

const CONFIG = `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`;
const APP = `const a = t("home.nav.contact");\n`;

describe("refresh concurrency", () => {
  let dir: string;

  beforeEach(() => {
    fake.resetState();
    analyzeQueue.length = 0;
    dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": APP,
    });
    fake.state.folders = [{ uri: fake.Uri.file(dir) }];
  });

  afterEach(cleanup);

  it("keeps existing project state available while a refresh is in flight", async () => {
    const api = activate({ subscriptions: [] } as any);
    await vi.waitFor(() => expect(fake.state.collection.cleared).toBe(1));

    const doc = fake.createDocument(path.join(dir, "src/app.ts"), APP);
    expect(fake.state.hover!.provider.provideHover(doc, new fake.Position(0, 15))).toBeDefined();

    const inflight = deferred<any>();
    analyzeQueue.push(inflight);

    const secondRefresh = api.refresh();
    await vi.waitFor(() => expect(analyzeQueue).toHaveLength(0));

    // Model/services must not be cleared mid-flight
    expect(fake.state.hover!.provider.provideHover(doc, new fake.Position(0, 15))).toBeDefined();

    inflight.resolve(
      await realAnalyzeRef.current!({
        root: dir,
        config: { defaultLocale: "en", locales: ["en", "tr"] },
        runtime: false,
      }),
    );
    await secondRefresh;
  });

  it("does not let an older slower refresh overwrite a newer faster refresh", async () => {
    const api = activate({ subscriptions: [] } as any);
    await vi.waitFor(() => expect(fake.state.collection.cleared).toBe(1));

    const baseResult = await realAnalyzeRef.current!({
      root: dir,
      config: { defaultLocale: "en", locales: ["en", "tr"] },
      runtime: false,
    });

    const slow = deferred<any>();
    const fast = deferred<any>();
    analyzeQueue.push(slow, fast);

    const slowRefresh = api.refresh();
    const fastRefresh = api.refresh();
    await vi.waitFor(() => expect(analyzeQueue).toHaveLength(0));

    const appFile = path.join(dir, "src/app.ts");
    fast.resolve({
      ...baseResult,
      issues: [
        {
          code: "unknown-path",
          level: "error",
          message: "fast-fresh-issue",
          file: appFile,
        },
      ],
    });
    await fastRefresh;

    slow.resolve({
      ...baseResult,
      issues: [
        {
          code: "unknown-path",
          level: "error",
          message: "slow-stale-issue",
          file: appFile,
        },
      ],
    });
    await slowRefresh;

    const messages = (fake.state.collection.entries.get(appFile) ?? []).map((d) => d.message);
    expect(messages).toEqual(["fast-fresh-issue"]);
  });
});
