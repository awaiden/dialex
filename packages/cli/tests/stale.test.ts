import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { TranslateProvider } from "dialexjs";
import { runCheck } from "../src/commands/check.js";
import { runImport } from "../src/commands/import.js";
import { runLock } from "../src/commands/lock.js";
import { runTranslate } from "../src/commands/translate.js";
import { getString, loadDictionaryFile } from "../src/utils/dictionary-edit.js";
import {
  hashSource,
  isStale,
  lockFor,
  readLock,
  writeLock,
  emptyLock,
} from "../src/utils/lockfile.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const dictionary = (en: Record<string, string>, tr: Record<string, string>) =>
  `export default { name: "home", dictionary: { en: ${JSON.stringify(en)}, tr: ${JSON.stringify(tr)} } };\n`;

function project(en: Record<string, string>, tr: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-stale-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(
    path.join(dir, "dialex.config.ts"),
    `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`,
  );
  fs.writeFileSync(path.join(dir, "src/home.content.ts"), dictionary(en, tr));
  return dir;
}

const setSource = (dir: string, en: Record<string, string>, tr: Record<string, string>) =>
  fs.writeFileSync(path.join(dir, "src/home.content.ts"), dictionary(en, tr));

const stub: TranslateProvider = {
  name: "stub",
  supportsIcu: true,
  translate: async (texts) => texts.map((t) => `tr:${t}`),
};

const tr = async (dir: string, key: string) =>
  getString((await loadDictionaryFile(path.join(dir, "src/home.content.ts")))!, "tr", [key]);

const check = (dir: string, extra = {}) =>
  runCheck({ cwd: dir, json: true, exitOnError: false, ...extra });
const staleIn = (r: Awaited<ReturnType<typeof check>>) =>
  r.diagnostics.flatMap((d) => d.annotations).filter((a) => a.message.includes("out of date"));

describe("lockfile helpers", () => {
  it("hashes deterministically and detects only recorded, changed text", () => {
    expect(hashSource("Hello")).toBe(hashSource("Hello"));
    expect(hashSource("Hello")).not.toBe(hashSource("Hello!"));
    expect(hashSource("Hello")).toMatch(/^[0-9a-f]{8}$/);

    const lock = emptyLock("en");
    lock.locales.tr = { "home.a": hashSource("A") };
    expect(isStale(lock, "tr", "home.a", "A")).toBe(false);
    expect(isStale(lock, "tr", "home.a", "A changed")).toBe(true);
    expect(isStale(lock, "tr", "home.untracked", "anything")).toBe(false);
    expect(isStale(lock, "de", "home.a", "A changed")).toBe(false);
  });

  it("writes sorted, stable JSON and ignores a broken or foreign file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-lock-"));
    dirs.push(dir);
    expect(readLock(dir)).toBeUndefined();
    const lock = emptyLock("en");
    lock.locales.tr = { "home.b": "22222222", "home.a": "11111111" };
    lock.locales.de = { "home.a": "33333333" };
    writeLock(dir, lock);
    const text = fs.readFileSync(path.join(dir, "dialex.lock.json"), "utf-8");
    expect(text.indexOf('"de"')).toBeLessThan(text.indexOf('"tr"'));
    expect(text.indexOf('"home.a"')).toBeLessThan(text.indexOf('"home.b"'));
    expect(text.endsWith("}\n")).toBe(true);
    expect(readLock(dir)).toEqual(lock);

    fs.writeFileSync(path.join(dir, "dialex.lock.json"), "not json");
    expect(readLock(dir)).toBeUndefined();
    fs.writeFileSync(
      path.join(dir, "dialex.lock.json"),
      JSON.stringify({ version: 2, locales: {} }),
    );
    expect(readLock(dir)).toBeUndefined();
  });

  it("replaces a lock written from another source locale", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-lock-"));
    dirs.push(dir);
    const lock = emptyLock("de");
    lock.locales.tr = { "home.a": "11111111" };
    writeLock(dir, lock);
    const result = lockFor(dir, "en");
    expect(result.replaced).toBe(true);
    expect(result.lock).toEqual(emptyLock("en"));
    expect(lockFor(dir, "de").replaced).toBe(false);
  });
});

describe("translate records what it translated from", () => {
  it("creates dialex.lock.json with a hash per translated key and nothing for hand-written ones", async () => {
    const dir = project({ title: "Welcome", bye: "Bye" }, { title: "Hoş geldiniz" });
    await runTranslate({ cwd: dir, provider: stub, json: true });

    const lock = readLock(dir)!;
    expect(lock.sourceLocale).toBe("en");
    expect(lock.locales.tr).toEqual({ "home.bye": hashSource("Bye") });
    expect(await tr(dir, "bye")).toBe("tr:Bye");
  });
});

describe("dx lock", () => {
  it("records untracked translations, leaves stale ones unless --all", async () => {
    const dir = project(
      { title: "Welcome", bye: "Bye" },
      { title: "Hoş geldiniz", bye: "Hoşça kal" },
    );
    const first = await runLock({ cwd: dir, json: true });
    expect(first).toMatchObject({ recorded: 2, stale: [] });
    expect(readLock(dir)!.locales.tr).toEqual({
      "home.bye": hashSource("Bye"),
      "home.title": hashSource("Welcome"),
    });

    expect(await runLock({ cwd: dir, json: true })).toMatchObject({ recorded: 0 });

    setSource(
      dir,
      { title: "Welcome back", bye: "Bye" },
      { title: "Hoş geldiniz", bye: "Hoşça kal" },
    );
    const stale = await runLock({ cwd: dir, json: true });
    expect(stale).toMatchObject({ recorded: 0, stale: ["tr:home.title"] });

    const accepted = await runLock({ cwd: dir, json: true, all: true });
    expect(accepted).toMatchObject({ recorded: 1, stale: [] });
    expect(readLock(dir)!.locales.tr["home.title"]).toBe(hashSource("Welcome back"));
  });

  it("does not record placeholders that are still [TODO]", async () => {
    const dir = project({ title: "Welcome" }, { title: "[TODO] Welcome" });
    expect(await runLock({ cwd: dir, json: true })).toMatchObject({ recorded: 0 });
  });
});

describe("dx check reports stale translations", () => {
  async function staleProject() {
    const dir = project(
      { title: "Welcome", bye: "Bye" },
      { title: "Hoş geldiniz", bye: "Hoşça kal" },
    );
    await runLock({ cwd: dir, json: true });
    setSource(
      dir,
      { title: "Welcome back", bye: "Bye" },
      { title: "Hoş geldiniz", bye: "Hoşça kal" },
    );
    return dir;
  }

  it("warns by default and fails with failOnStale", async () => {
    const dir = await staleProject();
    const warned = await check(dir);
    expect(warned.success).toBe(true);
    expect(staleIn(warned).map((a) => a.level)).toEqual(["warning"]);
    expect(staleIn(warned)[0].message).toContain('Locale "tr" key "title" is out of date');

    const failed = await check(dir, { failOnStale: true });
    expect(failed.success).toBe(false);
    expect(staleIn(failed).map((a) => a.level)).toEqual(["error"]);
  });

  it("says nothing without a lock file, or for translations that are not recorded", async () => {
    const dir = project({ title: "Welcome" }, { title: "Hoş geldiniz" });
    expect(staleIn(await check(dir))).toEqual([]);
    setSource(dir, { title: "Welcome back" }, { title: "Hoş geldiniz" });
    expect(staleIn(await check(dir))).toEqual([]); // no lock yet

    await runLock({ cwd: dir, json: true });
    setSource(dir, { title: "Welcome back" }, { title: "Hoş geldiniz" });
    expect(staleIn(await check(dir))).toEqual([]); // recorded against the new text: current
  });
});

describe("dx translate --stale", () => {
  it("re-translates only the out-of-date strings and records them again", async () => {
    const dir = project(
      { title: "Welcome", bye: "Bye" },
      { title: "Hoş geldiniz", bye: "Hoşça kal" },
    );
    await runLock({ cwd: dir, json: true });
    setSource(
      dir,
      { title: "Welcome back", bye: "Bye" },
      { title: "Hoş geldiniz", bye: "Hoşça kal" },
    );

    // Without --stale nothing is touched, even though the translation is out of date
    const plain = await runTranslate({ cwd: dir, provider: stub, json: true });
    expect(plain.pending).toEqual([]);
    expect(await tr(dir, "title")).toBe("Hoş geldiniz");

    const dry = await runTranslate({
      cwd: dir,
      provider: stub,
      stale: true,
      dryRun: true,
      json: true,
    });
    expect(dry.pending.map((p) => [p.key, p.stale])).toEqual([["home.title", true]]);

    const result = await runTranslate({ cwd: dir, provider: stub, stale: true, json: true });
    expect(result.translated).toBe(1);
    expect(await tr(dir, "title")).toBe("tr:Welcome back");
    expect(await tr(dir, "bye")).toBe("Hoşça kal"); // current translations are never replaced
    expect(readLock(dir)!.locales.tr["home.title"]).toBe(hashSource("Welcome back"));
    expect(staleIn(await check(dir))).toEqual([]);
  });
});

describe("dx import", () => {
  it("records imported translations only when a lock file is in use", async () => {
    const dir = project({ title: "Welcome" }, { title: "Hoş geldiniz" });
    fs.writeFileSync(path.join(dir, "tr.json"), JSON.stringify({ "home.title": "Hoş geldin" }));
    await runImport({ cwd: dir, file: "tr.json", json: true });
    expect(readLock(dir)).toBeUndefined(); // not adopted: no lock file is created by import

    await runLock({ cwd: dir, json: true });
    setSource(dir, { title: "Welcome back" }, { title: "Hoş geldin" });
    expect(staleIn(await check(dir))).toHaveLength(1);

    fs.writeFileSync(
      path.join(dir, "tr.json"),
      JSON.stringify({ "home.title": "Tekrar hoş geldin" }),
    );
    await runImport({ cwd: dir, file: "tr.json", json: true });
    expect(readLock(dir)!.locales.tr["home.title"]).toBe(hashSource("Welcome back"));
    expect(staleIn(await check(dir))).toEqual([]);
  });
});
