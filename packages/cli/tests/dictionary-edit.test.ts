import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  copyLeaf,
  flattenPaths,
  getString,
  hasPath,
  listLeaves,
  listLocales,
  loadDictionaryFile,
  saveDictionaryFile,
  setString,
} from "../src/utils/dictionary-edit.js";

describe("dictionary-edit", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-edit-test-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const write = (code: string) => {
    const file = path.join(dir, "home.content.ts");
    fs.writeFileSync(file, code, "utf-8");
    return file;
  };

  const sample = `import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome", // keep this comment
    greeting: (name: string) => \`Hello, \${name}!\`,
    nav: { about: "About", "my-link": "Link" },
  },
  tr: {
    title: "Hoş Geldiniz",
  },
});
`;

  it("lists locales and leaves with kinds", async () => {
    const df = (await loadDictionaryFile(write(sample)))!;
    expect(listLocales(df)).toEqual(["en", "tr"]);
    expect(listLeaves(df, "en")).toEqual([
      { path: ["title"], kind: "string", value: "Welcome" },
      { path: ["greeting"], kind: "function" },
      { path: ["nav", "about"], kind: "string", value: "About" },
      { path: ["nav", "my-link"], kind: "string", value: "Link" },
    ]);
  });

  it("copies template-literal functions and nested strings, preserving the rest of the file", async () => {
    const file = write(sample);
    const df = (await loadDictionaryFile(file))!;

    expect(copyLeaf(df, "en", "tr", ["greeting"])).toBe(true);
    expect(copyLeaf(df, "en", "tr", ["nav", "about"], (v) => `[TODO] ${v}`)).toBe(true);
    expect(copyLeaf(df, "en", "tr", ["nav", "my-link"])).toBe(true);
    expect(copyLeaf(df, "en", "tr", ["title"])).toBe(false); // already present
    await saveDictionaryFile(df);

    const out = fs.readFileSync(file, "utf-8");
    expect(out).toContain("// keep this comment");
    expect(out).toContain("greeting: (name: string) => `Hello, ${name}!`");
    expect(out).toContain('"[TODO] About"');
    expect(out).toContain('"my-link"');

    const reloaded = (await loadDictionaryFile(file))!;
    expect(getString(reloaded, "tr", ["nav", "about"])).toBe("[TODO] About");
    expect(hasPath(reloaded, "tr", ["greeting"])).toBe(true);
  });

  it("keeps the trailing newline of the original file", async () => {
    const file = write(sample);
    const df = (await loadDictionaryFile(file))!;
    setString(df, "tr", ["extra"], "x");
    await saveDictionaryFile(df);
    expect(fs.readFileSync(file, "utf-8").endsWith("\n")).toBe(true);

    const noNewline = write(sample.trimEnd());
    const df2 = (await loadDictionaryFile(noNewline))!;
    setString(df2, "tr", ["extra"], "x");
    await saveDictionaryFile(df2);
    expect(fs.readFileSync(noNewline, "utf-8").endsWith("\n")).toBe(false);
  });

  it("creates missing locales", async () => {
    const file = write(sample);
    const df = (await loadDictionaryFile(file))!;
    copyLeaf(df, "en", "de", ["title"], (v) => `[TODO] ${v}`);
    await saveDictionaryFile(df);

    const reloaded = (await loadDictionaryFile(file))!;
    expect(listLocales(reloaded)).toEqual(["en", "tr", "de"]);
    expect(getString(reloaded, "de", ["title"])).toBe("[TODO] Welcome");
  });

  it("sets strings: creates, updates, and skips functions", async () => {
    const file = write(sample);
    const df = (await loadDictionaryFile(file))!;
    expect(setString(df, "tr", ["title"], 'Merhaba "dünya"')).toBe("updated");
    expect(setString(df, "tr", ["nav", "about"], "Hakkında")).toBe("created");
    expect(setString(df, "en", ["greeting"], "nope")).toBe("skipped");
    await saveDictionaryFile(df);

    const reloaded = (await loadDictionaryFile(file))!;
    expect(getString(reloaded, "tr", ["title"])).toBe('Merhaba "dünya"');
    expect(getString(reloaded, "tr", ["nav", "about"])).toBe("Hakkında");
    expect(hasPath(reloaded, "en", ["greeting"])).toBe(true);
  });

  it("supports the object forms of dictionary files", async () => {
    const a = (await loadDictionaryFile(
      write(`export default defineDictionary({ name: "a", dictionary: { en: { x: "1" } } });`),
    ))!;
    expect(listLocales(a)).toEqual(["en"]);

    const b = (await loadDictionaryFile(
      write(`export default { name: "b", dictionary: { en: { x: "1" }, tr: {} } };`),
    ))!;
    expect(listLocales(b)).toEqual(["en", "tr"]);

    expect(await loadDictionaryFile(write(`const d = {}; export default d;`))).toBeUndefined();
  });

  it("flattens runtime values to leaf paths", () => {
    expect(flattenPaths({ a: 1, b: { c: "x", d: () => 1 }, e: [1, 2] })).toEqual([
      ["a"],
      ["b", "c"],
      ["b", "d"],
      ["e"],
    ]);
  });
});

describe("dictionary-edit: text parsing, completeness, locations, rendering", () => {
  const source = `import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome",
    greeting: (name: string) => \`Hello, \${name}!\`,
    nav: { about: "About" },
  },
  tr: {
    title: "Hoş Geldiniz",
  },
});
`;

  it("parses text without touching the disk and renders edits without writing", async () => {
    const { parseDictionaryText, renderDictionaryFile, setString, getString } =
      await import("../src/utils/dictionary-edit.js");
    const df = parseDictionaryText("/virtual/home.content.ts", source)!;
    expect(df.name).toBe("home");

    setString(df, "tr", ["extra"], "Ek");
    const rendered = renderDictionaryFile(df);
    expect(rendered).toContain('extra: "Ek"');
    expect(rendered.endsWith("\n")).toBe(true);
    expect(
      getString(parseDictionaryText("/virtual/home.content.ts", rendered)!, "tr", ["extra"]),
    ).toBe("Ek");
    expect(fs.existsSync("/virtual/home.content.ts")).toBe(false);
  });

  it("reports whether a dictionary is statically complete", async () => {
    const { parseDictionaryText } = await import("../src/utils/dictionary-edit.js");
    const complete = (code: string) => parseDictionaryText("/x.ts", code)?.complete;

    expect(complete(source)).toBe(true);
    expect(
      complete(`export default { name: "a", dictionary: { en: { ...shared, x: "1" } } };`),
    ).toBe(false);
    expect(complete(`export default { name: "a", dictionary: { en: { [key]: "1" } } };`)).toBe(
      false,
    );
    expect(complete(`export default { name: "a", dictionary: { en: enStrings } };`)).toBe(false);
    expect(complete(`export default { name: "a", dictionary: { ...base, en: {} } };`)).toBe(false);
    expect(
      complete(`export default { name: "a", dictionary: { en: { nested: { a: "1" } } } };`),
    ).toBe(true);
  });

  it("locates locales and keys with zero-based ranges", async () => {
    const { parseDictionaryText, locationOf, dictionaryLocation } =
      await import("../src/utils/dictionary-edit.js");
    const df = parseDictionaryText("/x.ts", source)!;

    expect(locationOf(df, "en")).toEqual({
      start: { line: 3, column: 2 },
      end: { line: 3, column: 4 },
    });
    expect(locationOf(df, "tr", ["title"])).toMatchObject({ start: { line: 9, column: 4 } });
    expect(locationOf(df, "en", ["nav", "about"])).toMatchObject({
      start: { line: 6, column: 11 },
    });
    expect(locationOf(df, "en", ["missing"])).toBeUndefined();
    expect(dictionaryLocation(df)?.start.line).toBe(2);
  });

  it("returns the source of function and string leaves", async () => {
    const { parseDictionaryText, getLeafSource } = await import("../src/utils/dictionary-edit.js");
    const df = parseDictionaryText("/x.ts", source)!;
    expect(getLeafSource(df, "en", ["greeting"])).toBe("(name: string) => `Hello, ${name}!`");
    expect(getLeafSource(df, "en", ["title"])).toBe('"Welcome"');
    expect(getLeafSource(df, "en", ["nope"])).toBeUndefined();
  });
});
