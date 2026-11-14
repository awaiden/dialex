import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
  type MessageConnection,
} from "vscode-jsonrpc/node.js";
import { createConnection } from "vscode-languageserver/node.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const { analyzeQueue, realAnalyzeRef, watcherClosers, startedWatchers } = vi.hoisted(() => ({
  analyzeQueue: [] as {
    promise: Promise<any>;
    resolve: (v: any) => void;
    reject: (e: unknown) => void;
  }[],
  realAnalyzeRef: { current: undefined as ((opts: any) => Promise<any>) | undefined },
  watcherClosers: [] as { promise: Promise<void>; resolve: () => void }[],
  startedWatchers: [] as string[],
}));

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
    startGenerateWatcher: vi.fn((root: string) => {
      startedWatchers.push(root);
      return {
        close: () => {
          const d = deferred<void>();
          watcherClosers.push(d);
          return d.promise;
        },
      };
    }),
  };
});

import { createServer } from "../src/server.js";
import { createGeneration } from "../src/server/generation.js";
import { DEFAULT_SETTINGS } from "../src/server/settings.js";
import { HOME, cleanup, writeProject } from "./helpers.js";

const CONFIG = `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`;
const APP = `const a = t("home.nav.contact");\n`;

const opened: MessageConnection[] = [];
const servers: { dispose(): Promise<void> }[] = [];

afterEach(async () => {
  analyzeQueue.length = 0;
  watcherClosers.length = 0;
  startedWatchers.length = 0;
  for (const server of servers.splice(0)) await server.dispose();
  for (const connection of opened.splice(0)) connection.dispose();
  cleanup();
});

async function startServer(dir: string) {
  const toServer = new PassThrough();
  const toClient = new PassThrough();

  const serverConnection = createConnection(toServer, toClient);
  const server = createServer(serverConnection);
  servers.push(server);
  serverConnection.listen();

  const connection = createMessageConnection(
    new StreamMessageReader(toClient),
    new StreamMessageWriter(toServer),
  );
  opened.push(connection);

  const published: { uri: string; diagnostics: { message: string }[] }[] = [];
  connection.onNotification("textDocument/publishDiagnostics", (params) => {
    published.push(params);
  });
  connection.onRequest("workspace/configuration", () => [{}]);
  connection.onRequest("client/registerCapability", () => null);
  connection.listen();

  await connection.sendRequest("initialize", {
    processId: null,
    rootUri: pathToFileURL(dir).href,
    workspaceFolders: [{ uri: pathToFileURL(dir).href, name: "test" }],
    capabilities: {
      workspace: {
        configuration: true,
        didChangeWatchedFiles: { dynamicRegistration: true },
      },
    },
  });
  await connection.sendNotification("initialized", {});

  await connection.sendNotification("textDocument/didOpen", {
    textDocument: {
      uri: pathToFileURL(path.join(dir, "src/app.ts")).href,
      languageId: "typescript",
      version: 1,
      text: APP,
    },
  });

  return { server, connection, published };
}

describe("language server concurrency", () => {
  it("keeps existing project state available while refresh() is in flight", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": APP,
    });

    const { server, connection } = await startServer(dir);
    await server.refresh();

    const appUri = pathToFileURL(path.join(dir, "src/app.ts")).href;
    const beforeHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: appUri },
      position: { line: 0, character: 15 },
    });
    expect(beforeHover).not.toBeNull();

    const inflight = deferred<any>();
    analyzeQueue.push(inflight);

    const pendingRefresh = server.refresh();
    await vi.waitFor(() => expect(analyzeQueue).toHaveLength(0));

    // Must not clear states mid-flight
    const midFlightHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: appUri },
      position: { line: 0, character: 15 },
    });
    expect(midFlightHover).not.toBeNull();

    inflight.resolve(
      await realAnalyzeRef.current!({
        root: dir,
        config: { defaultLocale: "en", locales: ["en", "tr"] },
        runtime: false,
      }),
    );
    await pendingRefresh;
  });

  it("does not let an older slower refresh() overwrite a newer faster refresh()", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": APP,
    });

    const { server, published } = await startServer(dir);
    await server.refresh();

    const baseResult = await realAnalyzeRef.current!({
      root: dir,
      config: { defaultLocale: "en", locales: ["en", "tr"] },
      runtime: false,
    });

    const slow = deferred<any>();
    const fast = deferred<any>();
    analyzeQueue.push(slow, fast);

    const slowRefresh = server.refresh();
    await vi.waitFor(() => expect(analyzeQueue).toHaveLength(1));
    const fastRefresh = server.refresh();
    await vi.waitFor(() => expect(analyzeQueue).toHaveLength(0));

    const appFile = path.join(dir, "src/app.ts");
    const appUri = pathToFileURL(appFile).href;

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

    await vi.waitFor(() => {
      const latestForApp =
        [...published].reverse().find((p) => p.uri === appUri)?.diagnostics ?? [];
      expect(latestForApp.map((d) => d.message)).toEqual(["fast-fresh-issue"]);
    });
  });

  it("bails out of superseded syncWatchers() calls after awaiting watcher.close()", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/dialex.generated.ts": "// generated\n",
    });
    fs.existsSync(path.join(dir, "src/dialex.generated.ts"));

    let enabled = true;
    let projects: any[] = [{ root: dir }];

    const generation = createGeneration({
      connection: {
        console: { info: vi.fn(), error: vi.fn() },
      } as any,
      folders: () => [dir],
      projectsIn: () => projects,
      settings: () => ({ ...DEFAULT_SETTINGS, enable: enabled, autoGenerate: true }),
      clientWatches: () => false,
      afterWatchRegenerate: vi.fn(),
    });

    // 1. Start watching `dir`
    await generation.syncWatchers();
    expect(startedWatchers).toEqual([dir]);
    startedWatchers.length = 0;

    // 2. Remove `dir` so syncWatchers #1 awaits watcher.close()
    projects = [];
    const firstSync = generation.syncWatchers();
    expect(watcherClosers).toHaveLength(1);

    const dir2 = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/dialex.generated.ts": "// generated\n",
    });

    watcherClosers[0].resolve();
    await firstSync;

    // Start watching `dir` again
    projects = [{ root: dir }];
    await generation.syncWatchers();
    startedWatchers.length = 0;
    watcherClosers.length = 0;

    // Now #1 wants `dir2` (so it closes `dir` and would start `dir2`)
    projects = [{ root: dir2 }];
    const supersededSync = generation.syncWatchers();
    expect(watcherClosers).toHaveLength(1);

    // While #1 is suspended at `await watcher.close()`, #2 disables generation
    enabled = false;
    const newerSync = generation.syncWatchers();
    await newerSync;

    // Now resolve #1's close()
    watcherClosers[0].resolve();
    await supersededSync;

    // #1 must NOT have started a watcher for dir2 after being superseded by #2
    expect(startedWatchers).toEqual([]);
  });
});
