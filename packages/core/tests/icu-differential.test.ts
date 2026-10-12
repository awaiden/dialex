import { describe, expect, it } from "vite-plus/test";

import { formatMessage } from "../src/icu/index.js";
import { IcuSyntaxError, parseMessage } from "../src/icu/parse.js";
import { referenceFormatMessage } from "./icu-reference.js";

/** What a call returned or how it failed, so both implementations can be compared. */
function outcome(run: () => string): { ok: string } | { error: string; message: string } {
  try {
    return { ok: run() };
  } catch (error) {
    return { error: (error as Error).name, message: (error as Error).message };
  }
}

const MESSAGES = [
  "Hello, world",
  "",
  "Hello, {name}!",
  "{a}{b}{c}",
  "{a} and {b}",
  "'{'literal'}' {name}",
  "{count, plural, =0 {No items} one {# item} other {# items}}",
  "{count, plural, one {# item} other {# items}}",
  "{count, plural, offset:1 =0 {Nobody} =1 {Just you} one {You and # other} other {You and # others}}",
  "{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}",
  "{gender, select, female {She} male {He} other {They}} has {count, plural, one {# item} other {# items}}",
  "{gender, select, female {{count, plural, one {She has # item} other {She has # items}}} male {{count, plural, one {He has # item} other {He has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}",
  "{n, number}",
  "{n, number, integer}",
  "{n, number, percent}",
  "{n, number, ::percent}",
  "{n, number, ::currency/EUR}",
  "{d, date}",
  "{d, date, short}",
  "{d, date, full}",
  "{d, time, short}",
  "{d, time}",
  "{count, plural, one {{kind, select, a {# apple} other {# fruit}}} other {{kind, select, a {# apples} other {# fruits}}}}",
  "{count, plural, =1.0 {never} =2 {two} other {#}}",
  "{ unclosed",
  "{count, plural, one {# item}}",
];

const LOCALES = ["en", "tr", "ar", "ru", "de", "ja", "pl"];

const COUNTS = [
  0,
  1,
  2,
  3,
  4,
  5,
  11,
  12,
  21,
  22,
  100,
  101,
  1234.5,
  -1,
  -0,
  0.5,
  1e21,
  "3",
  "x",
  NaN,
];

function valueSets(): Record<string, unknown>[] {
  const sets: Record<string, unknown>[] = [{}];
  const date = new Date(Date.UTC(2026, 9, 11, 13, 30));
  for (const count of COUNTS) {
    for (const gender of ["female", "male", "other", "robot", undefined]) {
      sets.push({
        count,
        n: count,
        rank: count,
        gender,
        kind: count === 1 ? "a" : "b",
        name: "Alex",
        a: "A",
        b: 2,
        c: null,
        d: date,
      });
    }
  }
  sets.push({ d: "not a date", n: "NaN", name: undefined });
  sets.push({ d: 1760189400000, count: 1, a: true, b: false });
  return sets;
}

describe("the compiled ICU formatter against the reference implementation", () => {
  for (const message of MESSAGES) {
    it(`formats ${JSON.stringify(message).slice(0, 70)} the same in every locale`, () => {
      for (const locale of LOCALES) {
        for (const values of valueSets()) {
          const expected = outcome(() => referenceFormatMessage(locale, message, values as any));
          const actual = outcome(() => formatMessage(locale, message, values as any));
          // The error classes differ by name only in their module of origin
          if ("error" in expected) {
            expect(actual, `${locale} ${JSON.stringify(values)}`).toEqual({
              error: expected.error === "ReferenceFormatError" ? "IcuFormatError" : expected.error,
              message: expected.message,
            });
          } else {
            expect(actual, `${locale} ${JSON.stringify(values)}`).toEqual(expected);
          }
        }
      }
    });
  }

  it("formats a parsed message the same as its source, and caches nothing it should not", () => {
    const message = "{count, plural, one {# item} other {# items}}";
    const nodes = parseMessage(message);
    for (const count of [0, 1, 5]) {
      expect(formatMessage("en", nodes, { count })).toBe(formatMessage("en", message, { count }));
    }
    expect(formatMessage("tr", nodes, { count: 3 })).toBe("3 items");
  });

  it("reports a syntax error every time, without caching it", () => {
    expect(() => formatMessage("en", "{ nope")).toThrow(IcuSyntaxError);
    expect(() => formatMessage("en", "{ nope")).toThrow(IcuSyntaxError);
  });

  it("does not take an object property of the select value for a branch", () => {
    const message = "{kind, select, a {first} other {fallback}}";
    expect(formatMessage("en", message, { kind: "constructor" })).toBe("fallback");
    expect(formatMessage("en", message, { kind: "toString" })).toBe("fallback");
  });
});
