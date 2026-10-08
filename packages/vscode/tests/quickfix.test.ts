import { describe, expect, it } from "vite-plus/test";
import { parseDictionaryText, getString, hasPath } from "@dialex/cli/api";
import { addMissingKeys, addUnknownKey } from "../src/quickfix.js";
import { HOME } from "./helpers.js";

const FILE = "/virtual/home.content.ts";

describe("addMissingKeys", () => {
  it("copies the key from the source locale with a [TODO] marker and keeps functions intact", () => {
    const text = addMissingKeys(FILE, HOME, [
      { locale: "tr", path: ["nav", "contact"], sourceLocale: "en" },
      { locale: "tr", path: ["note"], sourceLocale: "en" },
    ])!;

    const df = parseDictionaryText(FILE, text)!;
    expect(getString(df, "tr", ["nav", "contact"])).toBe("[TODO] Contact");
    expect(getString(df, "tr", ["note"])).toBe("[TODO] Pipes | and *stars*\nsecond line");
    expect(text).toContain("greeting: (name: string) => `Merhaba, ${name}!`");
  });

  it("copies function values as written", () => {
    const source = HOME.replace("    greeting: (name: string) => `Merhaba, ${name}!`,\n", "");
    const text = addMissingKeys(FILE, source, [
      { locale: "tr", path: ["greeting"], sourceLocale: "en" },
    ])!;
    expect(text).toContain("greeting: (name: string) => `Hello, ${name}!`");
  });

  it("returns undefined when nothing can be added", () => {
    expect(addMissingKeys(FILE, HOME, [])).toBeUndefined();
    expect(
      addMissingKeys(FILE, HOME, [{ locale: "tr", path: ["title"], sourceLocale: "en" }]),
    ).toBeUndefined();
    expect(
      addMissingKeys(FILE, HOME, [{ locale: "tr", path: ["nav", "contact"] }]),
    ).toBeUndefined();
    expect(
      addMissingKeys(FILE, "const x = 1;", [{ locale: "tr", path: ["a"], sourceLocale: "en" }]),
    ).toBeUndefined();
  });
});

describe("addUnknownKey", () => {
  it("adds a placeholder named after the key to every locale", () => {
    const text = addUnknownKey(FILE, HOME, ["nav", "pricing"])!;
    const df = parseDictionaryText(FILE, text)!;
    expect(getString(df, "en", ["nav", "pricing"])).toBe("[TODO] pricing");
    expect(getString(df, "tr", ["nav", "pricing"])).toBe("[TODO] pricing");
  });

  it("only touches locales that lack the key, and returns undefined if none do", () => {
    const text = addUnknownKey(FILE, HOME, ["nav", "contact"])!;
    const df = parseDictionaryText(FILE, text)!;
    expect(getString(df, "en", ["nav", "contact"])).toBe("Contact");
    expect(hasPath(df, "tr", ["nav", "contact"])).toBe(true);
    expect(addUnknownKey(FILE, HOME, ["title"])).toBeUndefined();
  });
});
