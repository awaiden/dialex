import { describe, expect, it } from "vite-plus/test";

import { IcuFormatError, formatMessage } from "../src/icu/format.js";
import { IcuSyntaxError } from "../src/icu/parse.js";

const items = "{count, plural, =0 {No items} one {# item} other {# items}}";

describe("formatMessage", () => {
  it("interpolates simple arguments", () => {
    expect(formatMessage("en", "Hello, {name}! You are {age}.", { name: "Ada", age: 36 })).toBe(
      "Hello, Ada! You are 36.",
    );
    expect(formatMessage("en", "No arguments here")).toBe("No arguments here");
  });

  it("formats plurals with exact matches and #", () => {
    expect(formatMessage("en", items, { count: 0 })).toBe("No items");
    expect(formatMessage("en", items, { count: 1 })).toBe("1 item");
    expect(formatMessage("en", items, { count: 1234 })).toBe("1,234 items");
    expect(formatMessage("de", items, { count: 1234 })).toBe("1.234 items");
  });

  it("follows each locale's CLDR plural rules", () => {
    const ru = "{n, plural, one {# файл} few {# файла} many {# файлов} other {# файла}}";
    expect([1, 2, 5, 21, 22, 25].map((n) => formatMessage("ru", ru, { n }))).toEqual([
      "1 файл",
      "2 файла",
      "5 файлов",
      "21 файл",
      "22 файла",
      "25 файлов",
    ]);

    // Turkish has no distinct plural forms beyond one/other, and French treats 0 as singular
    expect(formatMessage("tr", "{n, plural, one {bir} other {# tane}}", { n: 2 })).toBe("2 tane");
    expect(formatMessage("fr", "{n, plural, one {singulier} other {pluriel}}", { n: 0 })).toBe(
      "singulier",
    );

    const ar = "{n, plural, zero {z} one {o} two {t} few {f} many {m} other {x}}";
    expect([0, 1, 2, 3, 11, 100].map((n) => formatMessage("ar", ar, { n }))).toEqual([
      "z",
      "o",
      "t",
      "f",
      "m",
      "x",
    ]);
  });

  it("falls back to other when a category has no option", () => {
    expect(formatMessage("ru", "{n, plural, one {a} other {b}}", { n: 3 })).toBe("b");
  });

  it("applies plural offsets to # and categories but not to exact matches", () => {
    const msg =
      "{n, plural, offset:1 =0 {nobody} =1 {just you} one {you and # other} other {you and # others}}";
    expect([0, 1, 2, 3].map((n) => formatMessage("en", msg, { n }))).toEqual([
      "nobody",
      "just you",
      "you and 1 other",
      "you and 2 others",
    ]);
  });

  it("formats ordinals", () => {
    const msg = "{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}";
    expect([1, 2, 3, 4, 11, 21, 22, 103].map((n) => formatMessage("en", msg, { n }))).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "21st",
      "22nd",
      "103rd",
    ]);
  });

  it("selects by value with an other fallback, including inside plurals", () => {
    const msg = "{g, select, female {She} male {He} other {They}}";
    expect(formatMessage("en", msg, { g: "female" })).toBe("She");
    expect(formatMessage("en", msg, { g: "nonbinary" })).toBe("They");

    const nested =
      "{g, select, female {{n, plural, one {She has # item} other {She has # items}}} other {They}}";
    expect(formatMessage("en", nested, { g: "female", n: 3 })).toBe("She has 3 items");
  });

  it("formats numbers, percentages, and currencies", () => {
    expect(formatMessage("en", "{n, number}", { n: 1234.5 })).toBe("1,234.5");
    expect(formatMessage("en", "{n, number, integer}", { n: 1234.6 })).toBe("1,235");
    expect(formatMessage("en", "{n, number, percent}", { n: 0.25 })).toBe("25%");
    expect(formatMessage("en", "{n, number, ::currency/USD}", { n: 9.5 })).toBe("$9.50");
    expect(formatMessage("de", "{n, number}", { n: 1234.5 })).toBe("1.234,5");
  });

  it("formats dates and times", () => {
    const when = new Date(2024, 2, 5, 14, 30); // local time
    expect(formatMessage("en", "{d, date, long}", { d: when })).toBe("March 5, 2024");
    expect(formatMessage("en", "{d, date, short}", { d: when })).toBe("3/5/24");
    expect(formatMessage("en", "{d, date}", { d: when })).toBe("Mar 5, 2024");
    expect(formatMessage("en", "{d, time, short}", { d: when })).toMatch(/2:30\sPM/);
    expect(formatMessage("en", "{d, date, long}", { d: when.getTime() })).toBe("March 5, 2024");
  });

  it("treats escaped syntax as literal text", () => {
    expect(formatMessage("en", "Use '{braces}' and it''s fine for {name}", { name: "Ada" })).toBe(
      "Use {braces} and it's fine for Ada",
    );
  });

  it("throws clear errors", () => {
    expect(() => formatMessage("en", "Hi {name}", {})).toThrow(IcuFormatError);
    expect(() => formatMessage("en", "Hi {name}", {})).toThrow('Missing value for "name"');
    expect(() => formatMessage("en", items, { count: "many" })).toThrow('"count" must be a number');
    expect(() => formatMessage("en", "{d, date}", { d: "not a date" })).toThrow(
      '"d" must be a date',
    );
    expect(() => formatMessage("en", "Hi {name", {})).toThrow(IcuSyntaxError);
  });

  it("accepts a pre-parsed message and caches parsed strings", () => {
    expect(formatMessage("en", items, { count: 2 })).toBe("2 items");
    expect(formatMessage("en", items, { count: 2 })).toBe("2 items");
  });
});
