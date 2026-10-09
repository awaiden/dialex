import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { renderGenerated } from "../src/commands/generate.js";
import { parseDictionaryText } from "../src/utils/dictionary-edit.js";
import { messageArguments, messageType } from "../src/utils/message-arguments.js";

describe("messageType", () => {
  it("maps plural, selectordinal and number arguments to number", () => {
    expect(messageType("{count, plural, one {# item} other {# items}}")).toBe("{ count: number }");
    expect(messageType("{n, selectordinal, one {#st} other {#th}} place")).toBe("{ n: number }");
    expect(messageType("Total: {total, number, ::currency/USD}")).toBe("{ total: number }");
  });

  it("maps date and time to Date | number", () => {
    expect(messageType("On {when, date, short}")).toBe("{ when: Date | number }");
    expect(messageType("At {at, time}")).toBe("{ at: Date | number }");
  });

  it("lists select options, leaving room for other values", () => {
    expect(messageType("{gender, select, male {He} female {She} other {They}}")).toBe(
      '{ gender: "male" | "female" | (string & {}) }',
    );
    expect(messageType("{x, select, other {y}}")).toBe("{ x: string }");
  });

  it("types a plain argument loosely and joins several arguments", () => {
    expect(messageType("Hello, {name}!")).toBe("{ name: string | number | boolean | Date }");
    expect(messageType("{name} has {count, plural, other {# items}}")).toBe(
      "{ name: string | number | boolean | Date; count: number }",
    );
  });

  it("uses the narrowest type when an argument is used twice, and arguments nested in branches", () => {
    expect(messageType("{n} of {n, plural, other {#}}")).toBe("{ n: number }");
    expect(
      messageType("{g, select, a {{count, plural, one {# x} other {# xs}}} other {none}}"),
    ).toBe('{ g: "a" | (string & {}); count: number }');
  });

  it("returns nothing for plain text, messages without arguments and invalid ICU", () => {
    expect(messageType("Welcome")).toBeUndefined();
    expect(messageType("Use {{ braces }}")).toBeUndefined();
    expect(messageType("{count, plural, one {# item}")).toBeUndefined();
  });
});

describe("messageArguments", () => {
  const dictionary = (locales: string) =>
    parseDictionaryText(
      "home.content.ts",
      `import { defineDictionary } from "dialexjs";
export default defineDictionary("home", { ${locales} });`,
    );

  it("reads the default locale, falls back to the first, and skips functions and plain text", () => {
    const df = dictionary(`
      en: { title: "Hi", items: "{count, plural, other {# items}}", fn: (n: string) => n, nav: { owner: "{name}" } },
      tr: { items: "{adet, plural, other {# öğe}}" },
    `);
    expect(messageArguments([df], "en")).toEqual({
      "home.items": "{ count: number }",
      "home.nav.owner": "{ name: string | number | boolean | Date }",
    });
    // no "de" locale in the dictionary: the first one (en) is the reference
    expect(Object.keys(messageArguments([df], "de"))).toContain("home.items");
    // the Turkish locale is the reference when it is the default
    expect(
      messageArguments([dictionary(`tr: { items: "{adet, plural, other {#}}" }`)], "tr"),
    ).toEqual({
      "home.items": "{ adet: number }",
    });
  });
});

describe("dialex-env.d.ts", () => {
  it("declares MessageArguments for the generated project", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-msgargs-"));
    fs.mkdirSync(path.join(dir, "src"));
    fs.writeFileSync(
      path.join(dir, "src/cart.content.ts"),
      `export default { name: "cart", dictionary: { en: { items: "{count, plural, one {# item} other {# items}}", empty: "Empty" } } };\n`,
    );
    const { dtsContent } = renderGenerated(dir);
    expect(dtsContent).toContain(
      'export interface MessageArguments {\n    "cart.items": { count: number };\n  }',
    );
    expect(dtsContent).not.toContain('"cart.empty"');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
