import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
  type MessageConnection,
} from "vscode-jsonrpc/node.js";
import { createConnection } from "vscode-languageserver/node.js";

import { createServer } from "../src/server.js";
import { HOME, cleanup, writeProject } from "./helpers.js";

interface PublishedDiagnostics {
  uri: string;
  diagnostics: { message: string; code?: string | number; severity?: number }[];
}

interface Client {
  connection: MessageConnection;
  /** Diagnostics notifications received so far, in order. */
  published: PublishedDiagnostics[];
  /** The newest diagnostics for a file. */
  latest(file: string): PublishedDiagnostics["diagnostics"] | undefined;
  waitFor(predicate: () => boolean, ms?: number): Promise<void>;
}

const opened: MessageConnection[] = [];

async function start(
  dir: string,
  settings: Record<string, unknown> = {},
  watchedFilesRegistration = true,
): Promise<Client & { refresh(): Promise<void> }> {
  const toServer = new PassThrough();
  const toClient = new PassThrough();

  const serverConnection = createConnection(toServer, toClient);
  const server = createServer(serverConnection);
  serverConnection.listen();

  const connection = createMessageConnection(
    new StreamMessageReader(toClient),
    new StreamMessageWriter(toServer),
  );
  opened.push(connection);

  const published: PublishedDiagnostics[] = [];
  connection.onNotification("textDocument/publishDiagnostics", (params: PublishedDiagnostics) => {
    published.push(params);
  });
  connection.onRequest("workspace/configuration", () => [settings]);
  connection.onRequest("client/registerCapability", () => null);
  connection.listen();

  await connection.sendRequest("initialize", {
    processId: null,
    rootUri: pathToFileURL(dir).href,
    workspaceFolders: [{ uri: pathToFileURL(dir).href, name: "test" }],
    capabilities: {
      workspace: {
        configuration: true,
        didChangeWatchedFiles: { dynamicRegistration: watchedFilesRegistration },
      },
    },
  });
  await connection.sendNotification("initialized", {});

  const client: Client & { refresh(): Promise<void> } = {
    connection,
    published,
    refresh: () => server.refresh(),
    latest(file) {
      const uri = pathToFileURL(file).href;
      return [...published].reverse().find((entry) => entry.uri === uri)?.diagnostics;
    },
    async waitFor(predicate, ms = 3000) {
      const deadline = Date.now() + ms;
      while (!predicate()) {
        if (Date.now() > deadline) throw new Error("timed out waiting for the server");
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    },
  };
  return client;
}

function open(client: Client, file: string, languageId = "typescript") {
  return client.connection.sendNotification("textDocument/didOpen", {
    textDocument: {
      uri: pathToFileURL(file).href,
      languageId,
      version: 1,
      text: fs.readFileSync(file, "utf-8"),
    },
  });
}

const CONFIG = `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`;

afterEach(() => {
  for (const connection of opened.splice(0)) connection.dispose();
  cleanup();
});

describe("language server", () => {
  it("publishes diagnostics for dictionaries and for code that points at nothing", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": `getDictionary("nope");\n`,
    });
    const client = await start(dir);
    await client.refresh();
    await client.waitFor(() => client.latest(path.join(dir, "src/app.ts")) !== undefined);

    const dictionary = client.latest(path.join(dir, "src/home.content.ts"));
    expect(dictionary?.map((d) => d.message)).toContain('Locale "tr" is missing key "nav.contact"');
    expect(dictionary?.[0].code).toBeDefined();

    const code = client.latest(path.join(dir, "src/app.ts"));
    expect(code?.map((d) => d.message)).toContain('Unknown dictionary "nope"');
  });

  it("clears diagnostics once the problem is fixed and the file is saved", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": `getDictionary("nope");\n`,
    });
    const client = await start(dir);
    await client.refresh();
    const appFile = path.join(dir, "src/app.ts");
    await client.waitFor(() => (client.latest(appFile)?.length ?? 0) > 0);

    await open(client, appFile);
    fs.writeFileSync(appFile, `getDictionary("home");\n`);
    await client.connection.sendNotification("textDocument/didSave", {
      textDocument: { uri: pathToFileURL(appFile).href },
    });

    await client.waitFor(() => client.latest(appFile)?.length === 0);
  });

  it("answers hover on a translation key with the text in every locale", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": `const title = t("home.title");\n`,
    });
    const client = await start(dir);
    await client.refresh();
    const appFile = path.join(dir, "src/app.ts");
    await open(client, appFile);

    const hover = (await client.connection.sendRequest("textDocument/hover", {
      textDocument: { uri: pathToFileURL(appFile).href },
      position: { line: 0, character: 22 },
    })) as { contents: { kind: string; value: string }; range: unknown } | null;

    expect(hover?.contents.kind).toBe("markdown");
    expect(hover?.contents.value).toContain("Welcome");
    expect(hover?.contents.value).toContain("Hoş Geldiniz");
  });

  it("answers null on hover outside a reference", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": `const answer = 42;\n`,
    });
    const client = await start(dir);
    await client.refresh();
    const appFile = path.join(dir, "src/app.ts");
    await open(client, appFile);

    const hover = await client.connection.sendRequest("textDocument/hover", {
      textDocument: { uri: pathToFileURL(appFile).href },
      position: { line: 0, character: 3 },
    });
    expect(hover).toBeNull();
  });

  it("does nothing when the client sets dialex.enable to false", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": `getDictionary("nope");\n`,
    });
    const client = await start(dir, { enable: false });
    await client.refresh();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(client.published).toEqual([]);
  });

  it("keeps working when the client cannot register file watchers", async () => {
    const dir = writeProject({ "dialex.config.ts": CONFIG, "src/home.content.ts": HOME });
    const client = await start(dir, {}, false);
    await client.refresh();
    const file = path.join(dir, "src/home.content.ts");
    await client.waitFor(() => (client.latest(file)?.length ?? 0) > 0);
  });

  it("jumps from a key to where the dictionary defines it", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": `const title = t("home.title");\n`,
    });
    const client = await start(dir);
    await client.refresh();
    const appFile = path.join(dir, "src/app.ts");
    await open(client, appFile);

    const location = (await client.connection.sendRequest("textDocument/definition", {
      textDocument: { uri: pathToFileURL(appFile).href },
      position: { line: 0, character: 22 },
    })) as { uri: string; range: { start: { line: number } } } | null;

    expect(location?.uri).toBe(pathToFileURL(path.join(dir, "src/home.content.ts")).href);
    expect(location?.range.start.line).toBeGreaterThan(0);
  });

  it("completes dictionary names and key paths inside t()", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": `t("ho");\nt("home.");\nt("home.nav.");\n`,
    });
    const client = await start(dir);
    await client.refresh();
    const appFile = path.join(dir, "src/app.ts");
    await open(client, appFile);
    const complete = async (line: number, character: number) =>
      (await client.connection.sendRequest("textDocument/completion", {
        textDocument: { uri: pathToFileURL(appFile).href },
        position: { line, character },
      })) as {
        label: string;
        textEdit: { newText: string; range: { start: { character: number } } };
      }[];

    const names = await complete(0, 5);
    expect(names.map((item) => item.textEdit.newText)).toContain("home.");
    expect(names[0].textEdit.range.start.character).toBe(3);

    const keys = await complete(1, 8);
    expect(keys.map((item) => item.label)).toEqual(expect.arrayContaining(["title", "nav"]));

    const nested = await complete(2, 12);
    expect(nested.map((item) => item.label)).toEqual(expect.arrayContaining(["about", "contact"]));

    expect(await complete(0, 0)).toEqual([]);
  });

  it("offers quick fixes: copy a missing key, add every missing key, create an unknown key", async () => {
    const dir = writeProject({
      "dialex.config.ts": CONFIG,
      "src/home.content.ts": HOME,
      "src/app.ts": `t("home.brandNew");\n`,
    });
    const client = await start(dir);
    await client.refresh();
    const dictionaryFile = path.join(dir, "src/home.content.ts");
    const appFile = path.join(dir, "src/app.ts");
    await client.waitFor(
      () => client.latest(dictionaryFile) !== undefined && client.latest(appFile) !== undefined,
    );
    await open(client, dictionaryFile);
    await open(client, appFile);

    type Action = {
      title: string;
      edit: { changes: Record<string, { newText: string }[]> };
    };
    const actionsFor = async (file: string) =>
      (await client.connection.sendRequest("textDocument/codeAction", {
        textDocument: { uri: pathToFileURL(file).href },
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        context: { diagnostics: client.latest(file) },
      })) as Action[];

    const onDictionary = await actionsFor(dictionaryFile);
    const missing = onDictionary.find((action) => action.title.includes("nav.contact"));
    expect(missing).toBeDefined();
    const [edit] = missing!.edit.changes[pathToFileURL(dictionaryFile).href];
    expect(edit.newText).toContain("[TODO] Contact");

    const onCode = await actionsFor(appFile);
    const created = onCode.find((action) => action.title.includes("brandNew"));
    expect(created).toBeDefined();
    const target = Object.keys(created!.edit.changes)[0];
    expect(target).toBe(pathToFileURL(dictionaryFile).href);
    expect(created!.edit.changes[target][0].newText).toContain("brandNew");
  });
});
