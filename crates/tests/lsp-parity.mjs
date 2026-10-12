// Runs the Node language server and the native one on identical copies of each fixture and
// compares diagnostics, hover, definition, completion and code actions.
//
//   node crates/tests/lsp-parity.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildFixtures } from "./fixtures.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const nodeServer = path.join(root, "packages/language-server/dist/index.mjs");
const nativeServer = path.join(root, "crates/target/release/dialex-language-server");

const SKIP = new Set([
  "node_modules",
  "dist",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".git",
  ".turbo",
  "build",
  ".expo",
  ".intlayer",
]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Client {
  constructor(command, args) {
    this.child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      // the native server runs this to write `.dialex/config.json`; the Node one ignores it
      env: {
        ...process.env,
        DIALEX_CONFIG_RESOLVER: path.resolve(
          import.meta.dirname,
          "../../packages/config/dist/cli.mjs",
        ),
      },
    });
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
    this.diagnostics = new Map();
    this.lastPublish = Date.now();
    this.child.stdout.on("data", (chunk) => this.onData(chunk));
    this.child.stderr.on("data", () => {});
  }
  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const end = this.buffer.indexOf("\r\n\r\n");
      if (end < 0) return;
      const header = this.buffer.slice(0, end).toString();
      const length = Number(/Content-Length: (\d+)/i.exec(header)[1]);
      if (this.buffer.length < end + 4 + length) return;
      const body = JSON.parse(this.buffer.slice(end + 4, end + 4 + length).toString());
      this.buffer = this.buffer.slice(end + 4 + length);
      this.onMessage(body);
    }
  }
  onMessage(message) {
    if (message.method === "textDocument/publishDiagnostics") {
      this.diagnostics.set(message.params.uri, message.params.diagnostics);
      this.lastPublish = Date.now();
    } else if (message.id !== undefined && message.method) {
      // a request from the server (registerCapability, configuration): answer with nothing
      this.write({
        jsonrpc: "2.0",
        id: message.id,
        result: message.method === "workspace/configuration" ? [null] : null,
      });
    } else if (message.id !== undefined) {
      const done = this.pending.get(message.id);
      if (done) {
        this.pending.delete(message.id);
        done(message);
      }
    }
  }
  write(message) {
    const body = Buffer.from(JSON.stringify(message));
    this.child.stdin.write(
      Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]),
    );
  }
  request(method, params) {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }
  notify(method, params) {
    this.write({ jsonrpc: "2.0", method, params });
  }
  async quiet(minimum = 700, settle = 1200) {
    await sleep(minimum);
    while (Date.now() - this.lastPublish < settle) await sleep(100);
  }
  async close() {
    await Promise.race([this.request("shutdown", null), sleep(1500)]);
    this.notify("exit", null);
    await sleep(100);
    this.child.kill();
  }
}

function copy(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true, filter: (source) => !SKIP.has(path.basename(source)) });
  if (fs.existsSync(path.join(from, "node_modules"))) {
    fs.symlinkSync(path.join(from, "node_modules"), path.join(to, "node_modules"));
  }
}

function listFiles(dir, extensions) {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        extensions.some((e) => entry.name.endsWith(e)) &&
        !entry.name.endsWith(".d.ts") &&
        !entry.name.includes("generated")
      )
        out.push(full);
    }
  };
  walk(dir);
  return out.toSorted();
}

const VIRTUAL = `import { useDictionary } from "dialexjs/react";
const s = useDictionary("a");
const x = s.nav.home + s.title + s.nav.
t("a.");
t("a.nav.");
t("a.nav.ho");
t("");
t("b.");
getDictionary("b").hello;
getDictionary("a").nav.about;
const ünï = getDictionary("a"); ünï.title; t("a.título");
`;

async function session(server, args, dir, extraDocs) {
  const client = new Client(
    server.endsWith(".mjs") ? process.execPath : server,
    server.endsWith(".mjs") ? [server, ...args] : args,
  );
  const rootUri = pathToFileURL(dir).href;
  await client.request("initialize", {
    processId: process.pid,
    rootUri,
    workspaceFolders: [{ uri: rootUri, name: "x" }],
    capabilities: { workspace: { configuration: false } },
  });
  client.notify("initialized", {});

  const docs = [];
  const files = listFiles(dir, [".ts", ".tsx", ".js", ".vue", ".svelte", ".astro"]).slice(0, 40);
  for (const file of files)
    docs.push([pathToFileURL(file).href, fs.readFileSync(file, "utf-8"), file]);
  docs.push(
    ...extraDocs.map(([name, text]) => [
      pathToFileURL(path.join(dir, name)).href,
      text,
      path.join(dir, name),
    ]),
  );
  for (const [uri, text] of docs) {
    client.notify("textDocument/didOpen", {
      textDocument: { uri, languageId: "typescript", version: 1, text },
    });
  }
  await client.quiet();

  const results = { diagnostics: {}, hover: [], definition: [], completion: [], codeAction: [] };
  for (const [uri, diagnostics] of [...client.diagnostics].toSorted())
    results.diagnostics[uri] = diagnostics;

  for (const [uri, text] of docs) {
    const lines = text.split("\n");
    let budget = 500;
    for (let line = 0; line < lines.length && budget > 0; line++) {
      const content = lines[line];
      if (!/Dictionary|\bt\(|\.\w/.test(content)) continue;
      for (let character = 0; character <= content.length && budget > 0; character++, budget--) {
        const position = { line, character };
        const params = { textDocument: { uri }, position };
        const [hover, definition, completion] = await Promise.all([
          client.request("textDocument/hover", params),
          client.request("textDocument/definition", params),
          client.request("textDocument/completion", params),
        ]);
        if (hover.result) results.hover.push([uri, line, character, hover.result]);
        if (definition.result) results.definition.push([uri, line, character, definition.result]);
        if (completion.result?.length)
          results.completion.push([uri, line, character, completion.result]);
      }
    }
  }

  for (const [uri, diagnostics] of Object.entries(results.diagnostics)) {
    if (!diagnostics.length) continue;
    const zero = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
    const each = diagnostics.map((d) => [d.range, [d]]);
    for (const [range, context] of [...each, [zero, diagnostics]]) {
      const response = await client.request("textDocument/codeAction", {
        textDocument: { uri },
        range,
        context: { diagnostics: context },
      });
      results.codeAction.push([uri, range, response.result ?? []]);
    }
  }
  await client.close();
  return results;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-lsp-parity-"));
const only = process.argv[2];
const fixtures = buildFixtures(tmp).filter(([name]) => !only || name.includes(only));
let failures = 0;

for (const [name, source] of fixtures) {
  const a = path.join(tmp, "node", name.replace("/", "-"));
  const b = path.join(tmp, "native", name.replace("/", "-"));
  copy(source, a);
  copy(source, b);
  const extra = name.startsWith("issues") ? [["src/virtual.ts", VIRTUAL]] : [];

  let expected = await session(nodeServer, ["--stdio"], a, extra);
  let actual = await session(nativeServer, ["--stdio"], b, extra);
  const normalize = (value, dir) =>
    JSON.stringify(value).split(pathToFileURL(dir).href).join("<root>").split(dir).join("<root>");
  // The native editor and recast lay edited text out differently (blank lines, single-line
  // objects); what must match is the code, so edits compare without whitespace and trailing commas.
  let sameText = 0;
  let totalText = 0;
  const loosen = (results) => ({
    ...results,
    codeAction: results.codeAction.map(([uri, range, actions]) => [
      uri,
      range,
      actions.map((action) => ({
        ...action,
        edit: action.edit && {
          changes: Object.fromEntries(
            Object.entries(action.edit.changes).map(([file, edits]) => [
              file,
              edits.map((edit) => ({
                ...edit,
                newText: edit.newText.replace(/\s+/g, "").replace(/,(?=[}\]])/g, ""),
              })),
            ]),
          ),
        },
      })),
    ]),
  });
  for (let i = 0; i < expected.codeAction.length; i++) {
    const texts = (r) =>
      r.codeAction[i][2].flatMap((a) =>
        Object.values(a.edit?.changes ?? {})
          .flat()
          .map((e) => e.newText),
      );
    const left = texts(expected);
    const right = texts(actual);
    left.forEach((text, j) => {
      totalText++;
      if (text === right[j]) sameText++;
    });
  }
  const strict = { expected, actual };
  expected = loosen(strict.expected);
  actual = loosen(strict.actual);

  const problems = [];
  for (const section of Object.keys(expected)) {
    const left = normalize(expected[section], a);
    const right = normalize(actual[section], b);
    if (left === right) continue;
    // Narrow it down to the first entry that differs
    const l = JSON.parse(left);
    const r = JSON.parse(right);
    if (Array.isArray(l)) {
      const index = l.findIndex((item, i) => JSON.stringify(item) !== JSON.stringify(r[i]));
      problems.push(
        `${section}: ${l.length} vs ${r.length} entries, first difference at ${index}\n  node:   ${JSON.stringify(l[index] ?? null).slice(0, 500)}\n  native: ${JSON.stringify(r[index] ?? null).slice(0, 500)}`,
      );
    } else {
      const keys = [...new Set([...Object.keys(l), ...Object.keys(r)])].filter(
        (k) => JSON.stringify(l[k]) !== JSON.stringify(r[k]),
      );
      problems.push(
        `${section}: differs for ${keys.slice(0, 3).join(", ")}\n  node:   ${JSON.stringify(l[keys[0]] ?? null).slice(0, 600)}\n  native: ${JSON.stringify(r[keys[0]] ?? null).slice(0, 600)}`,
      );
    }
  }
  const counts = `${Object.values(expected.diagnostics).flat().length} diagnostics, ${expected.hover.length} hovers, ${expected.definition.length} definitions, ${expected.completion.length} completions, ${expected.codeAction.length} actions`;
  if (problems.length) {
    failures++;
    console.log(`FAIL ${name} (${counts})\n  ${problems.join("\n  ")}`);
  } else {
    console.log(`ok   ${name} (${counts}; edit text byte-identical ${sameText}/${totalText})`);
  }
}

console.log(`\n${fixtures.length - failures}/${fixtures.length} identical`);
process.exit(failures ? 1 : 0);
