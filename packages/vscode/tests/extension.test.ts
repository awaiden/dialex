import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { HOME, cleanup, writeProject } from "./helpers.js";

vi.mock("vscode", async () => await import("./fake-vscode.js"));

import * as fake from "./fake-vscode.js";
import { activate, type DialexApi } from "../src/extension.js";

const { state } = fake;

const CONFIG = `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`;
const APP = `const dict = getDictionary("home");
const a = t("home.nav.contact");
const b = t("home.nav.pricing");
const c = getDictionary("nope");
`;

let api: DialexApi;
let dir: string;

async function start(files: Record<string, string> = {}, settings: Record<string, unknown> = {}) {
  dir = writeProject({
    "dialex.config.ts": CONFIG,
    "src/home.content.ts": HOME,
    "src/app.ts": APP,
    ...files,
  });
  state.folders = [{ uri: fake.Uri.file(dir) }];
  Object.assign(state.settings, settings);
  api = activate({ subscriptions: [] } as any);
  await api.refresh();
}

const diagnosticsFor = (rel: string) => state.collection.entries.get(path.join(dir, rel)) ?? [];
const doc = (rel: string) => fake.createDocument(path.join(dir, rel));
const position = (text: string, line: number, needle: string, offset = 1) =>
  new fake.Position(line, text.split("\n")[line].indexOf(needle) + offset);

beforeEach(() => fake.resetState());
afterEach(cleanup);

describe("activation", () => {
  it("registers providers for source languages, a command, and file watchers", async () => {
    await start();

    const languages = (selector: any[]) =>
      selector.map((s) => s.language).sort((a, b) => a.localeCompare(b));
    const expected = [
      "astro",
      "javascript",
      "javascriptreact",
      "svelte",
      "typescript",
      "typescriptreact",
      "vue",
    ];
    expect(languages(state.hover!.selector)).toEqual(expected);
    expect(languages(state.definition!.selector)).toEqual(expected);
    expect(languages(state.completion!.selector)).toEqual(expected);
    expect(languages(state.codeActions!.selector)).toEqual(expected);
    expect(state.completion!.triggers).toEqual(['"', "'", "`", "."]);
    expect(state.codeActions!.metadata.providedCodeActionKinds).toEqual(["quickfix"]);

    expect(state.commands.has("dialex.refresh")).toBe(true);
    expect(state.watchers.map((w) => w.pattern)).toEqual([
      "**/*.content.ts",
      "**/dialex.config.*",
      "**/i18n.config.*",
    ]);
  });

  it("re-analyzes (debounced) when files change or settings change", async () => {
    vi.useFakeTimers();
    try {
      await start();
      const before = state.collection.cleared;

      state.watchers[0].fire.change();
      state.watchers[0].fire.change();
      state.saveHandlers[0]();
      await vi.advanceTimersByTimeAsync(400);
      expect(state.collection.cleared).toBe(before + 1); // one refresh for three events

      state.configHandlers[0]({ affectsConfiguration: (section: string) => section === "dialex" });
      state.configHandlers[0]({ affectsConfiguration: () => false });
      await vi.advanceTimersByTimeAsync(400);
      expect(state.collection.cleared).toBe(before + 2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("diagnostics", () => {
  it("publishes analysis issues with severity, code, and range", async () => {
    await start();

    const dictionary = diagnosticsFor("src/home.content.ts");
    expect(dictionary.map((d) => [d.code, d.severity, d.message])).toEqual([
      ["missing-key", fake.DiagnosticSeverity.Error, 'Locale "tr" is missing key "note"'],
      ["missing-key", fake.DiagnosticSeverity.Error, 'Locale "tr" is missing key "nav.contact"'],
    ]);
    expect(dictionary[0].source).toBe("dialex");
    expect(dictionary[0].range.start.line).toBe(
      HOME.split("\n").findIndex((l) => l.includes("  tr: {")),
    );

    const app = diagnosticsFor("src/app.ts");
    expect(app.map((d) => d.message)).toEqual([
      'Unknown translation path "home.nav.pricing"',
      'Unknown dictionary "nope"',
    ]);
    expect(app[0].range.start).toMatchObject({ line: 2 });
    expect(APP.split("\n")[2].slice(app[0].range.start.character, app[0].range.end.character)).toBe(
      "home.nav.pricing",
    );
  });

  it("shows unused keys as faded hints only when enabled", async () => {
    await start({ "src/app.ts": `getDictionary("home").title;\n` });
    expect(diagnosticsFor("src/home.content.ts").some((d) => d.code === "unused-key")).toBe(false);

    fake.resetState();
    await start({ "src/app.ts": `getDictionary("home").title;\n` }, { unusedKeys: true });
    const hints = diagnosticsFor("src/home.content.ts").filter((d) => d.code === "unused-key");
    expect(hints.length).toBeGreaterThan(0);
    expect(hints[0].severity).toBe(fake.DiagnosticSeverity.Hint);
    expect(hints[0].tags).toEqual([fake.DiagnosticTag.Unnecessary]);
  });

  it("does nothing when disabled", async () => {
    await start({}, { enable: false });
    expect(state.collection.entries.size).toBe(0);

    const app = doc("src/app.ts");
    expect(state.hover!.provider.provideHover(app, position(APP, 1, "home.nav"))).toBeUndefined();
  });

  it("honors dialex.configPath", async () => {
    // The default config requires en and tr; the custom one also requires de.
    await start(
      { "custom/i18n.json": JSON.stringify({ defaultLocale: "en", locales: ["en", "tr", "de"] }) },
      { configPath: "custom/i18n.json" },
    );
    expect(diagnosticsFor("src/home.content.ts").map((d) => d.message)).toContain(
      'Missing configured locale "de"',
    );

    fake.resetState();
    await start({ "custom/i18n.json": JSON.stringify({ locales: ["en", "tr", "de"] }) });
    expect(diagnosticsFor("src/home.content.ts").map((d) => d.message)).not.toContain(
      'Missing configured locale "de"',
    );
  });
});

describe("hover, definition, completion", () => {
  it("hovers a key with every locale's text", async () => {
    await start();
    const app = doc("src/app.ts");
    const hover = state.hover!.provider.provideHover(
      app,
      position(APP, 1, "home.nav"),
    ) as fake.Hover;

    expect(hover.contents.value).toContain("| en | Contact |");
    expect(hover.contents.value).toContain("| tr | _missing_ |");
    expect(hover.contents.supportHtml).toBe(true);
    expect(APP.split("\n")[1].slice(hover.range.start.character, hover.range.end.character)).toBe(
      "home.nav.contact",
    );
    expect(state.hover!.provider.provideHover(app, new fake.Position(1, 0))).toBeUndefined();
  });

  it("jumps to the key's definition in the dictionary file", async () => {
    await start();
    const app = doc("src/app.ts");
    const location = state.definition!.provider.provideDefinition(
      app,
      position(APP, 1, "home.nav"),
    ) as fake.Location;

    expect(location.uri.fsPath).toBe(path.join(dir, "src/home.content.ts"));
    expect(location.range.start.line).toBe(
      HOME.split("\n").findIndex((l) => l.includes("contact:")),
    );
  });

  it("completes dictionary names and keys, replacing what was typed", async () => {
    await start();
    const source = `const x = t("home.na`;
    const document = fake.createDocument(path.join(dir, "src/app.ts"), source);
    const items = state.completion!.provider.provideCompletionItems(
      document,
      new fake.Position(0, source.length),
    ) as fake.CompletionItem[];

    expect(items.map((i) => [i.label, i.insertText, i.kind])).toEqual([
      ["nav", "nav.", fake.CompletionItemKind.Folder],
    ]);
    expect(items[0].range).toMatchObject({
      start: { character: source.length - 2 },
      end: { character: source.length },
    });
    expect(items[0].command?.command).toBe("editor.action.triggerSuggest");

    const names = state.completion!.provider.provideCompletionItems(
      fake.createDocument(path.join(dir, "src/app.ts"), `getDictionary("`),
      new fake.Position(0, 15),
    ) as fake.CompletionItem[];
    expect(names.map((i) => i.label)).toEqual(["home"]);
    expect(names[0].command).toBeUndefined();

    expect(
      state.completion!.provider.provideCompletionItems(
        fake.createDocument(path.join(dir, "src/app.ts"), `const x = 1`),
        new fake.Position(0, 5),
      ),
    ).toBeUndefined();
  });
});

describe("quick fixes", () => {
  const actionsFor = async (rel: string, wanted: (d: fake.Diagnostic) => boolean) => {
    const document = doc(rel);
    const diagnostics = diagnosticsFor(rel).filter(wanted);
    return (await state.codeActions!.provider.provideCodeActions(document, diagnostics[0].range, {
      diagnostics,
    })) as fake.CodeAction[];
  };

  it("adds a missing key to the locale, replacing the whole file", async () => {
    await start();
    const [action] = await actionsFor("src/home.content.ts", (d) =>
      d.message.includes('"nav.contact"'),
    );

    expect(action.title).toBe('Add "nav.contact" to tr (marked [TODO])');
    expect(action.kind).toBe("quickfix");
    expect(action.isPreferred).toBe(true);
    const [edit] = action.edit!.edits;
    expect(edit.uri.fsPath).toBe(path.join(dir, "src/home.content.ts"));
    expect(edit.text).toContain('contact: "[TODO] Contact"');
    expect(edit.range.start).toMatchObject({ line: 0, character: 0 });
    expect(edit.range.end.line).toBe(HOME.split("\n").length - 1);
    expect(fs.readFileSync(path.join(dir, "src/home.content.ts"), "utf-8")).toBe(HOME); // nothing written
  });

  it("offers one action that adds every missing key in the file", async () => {
    await start();
    const actions = await actionsFor("src/home.content.ts", () => true);
    const all = actions.find((a) => a.title.startsWith("Add all"))!;

    expect(all.title).toBe("Add all 2 missing keys (marked [TODO])");
    expect(all.edit!.edits[0].text).toContain('contact: "[TODO] Contact"');
    expect(all.edit!.edits[0].text).toContain('note: "[TODO] Pipes | and *stars*\\nsecond line"');
  });

  it("adds an unknown key to the dictionary file from the code that uses it", async () => {
    await start();
    const [action] = await actionsFor("src/app.ts", (d) => d.code === "unknown-path");

    expect(action.title).toBe('Add "nav.pricing" to the "home" dictionary');
    const [edit] = action.edit!.edits;
    expect(edit.uri.fsPath).toBe(path.join(dir, "src/home.content.ts")); // a different file than the one open
    expect(edit.text.match(/pricing: "\[TODO\] pricing"/g)).toHaveLength(2); // en and tr
  });

  it("offers nothing for diagnostics it does not know how to fix", async () => {
    await start();
    const actions = await actionsFor("src/app.ts", (d) => d.code === "unknown-dictionary");
    expect(actions).toEqual([]);
  });
});
