import { describe, expect, it } from "vite-plus/test";

import { formatMessage } from "../src/icu/index.js";
import {
  dateTimeFormat,
  formatNumber,
  numberFormat,
  pluralCategory,
  pluralRules,
} from "../src/intl.js";

describe("shared Intl formatters", () => {
  it("reuses one instance per locale and options", () => {
    expect(numberFormat("en")).toBe(numberFormat("en"));
    expect(numberFormat("en", { style: "percent" })).toBe(numberFormat("en", { style: "percent" }));
    expect(pluralRules("en", { type: "ordinal" })).toBe(pluralRules("en", { type: "ordinal" }));
  });

  it("keeps locales and options apart", () => {
    expect(numberFormat("en")).not.toBe(numberFormat("de"));
    expect(numberFormat("en")).not.toBe(numberFormat("en", { style: "percent" }));
    expect(numberFormat("de").format(1234.5)).toBe("1.234,5");
    expect(numberFormat("en").format(1234.5)).toBe("1,234.5");
    expect(dateTimeFormat("en", { dateStyle: "short" })).not.toBe(
      dateTimeFormat("en", { timeStyle: "short" }),
    );
  });

  it("formats interleaved locales and plural types correctly", () => {
    const message = "{n, plural, one {# item} other {# items}}";
    for (let i = 0; i < 3; i++) {
      expect(formatMessage("en", message, { n: 1 })).toBe("1 item");
      expect(formatMessage("en", message, { n: 1234 })).toBe("1,234 items");
      expect(formatMessage("de", message, { n: 1234 })).toBe("1.234 items");
      expect(
        formatMessage("en", "{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}", {
          n: 22,
        }),
      ).toBe("22nd");
    }
  });
});

describe("options that are changed later", () => {
  it("do not reuse a formatter built for their earlier contents", () => {
    const options: Intl.NumberFormatOptions = { style: "percent" };
    expect(numberFormat("en", options).format(0.5)).toBe("50%");

    options.style = "decimal";
    expect(numberFormat("en", options).format(0.5)).toBe("0.5");
  });

  it("share a formatter when the options object is frozen", () => {
    const options = Object.freeze({ style: "percent" } as Intl.NumberFormatOptions);
    expect(numberFormat("en", options)).toBe(numberFormat("en", options));
    expect(numberFormat("de", options)).not.toBe(numberFormat("en", options));
  });
});

describe("memoized plural categories and integers", () => {
  const LOCALES = ["en", "tr", "de", "ru", "pl", "ar", "fa", "hi-u-nu-deva", "ja", "cy", "he"];
  // small integers (cached), then values that must go to Intl: negative, fractional, large, -0
  const NUMBERS = [
    ...Array.from({ length: 300 }, (_, i) => i),
    -1,
    -0,
    0.5,
    1.5,
    255.5,
    1000,
    1234567,
    Number.MAX_SAFE_INTEGER,
  ];

  it("returns exactly what Intl returns for every locale and number", () => {
    for (const locale of LOCALES) {
      for (const ordinal of [false, true]) {
        const rules = new Intl.PluralRules(locale, { type: ordinal ? "ordinal" : "cardinal" });
        const format = new Intl.NumberFormat(locale);
        // twice: the second pass reads the filled cache
        for (let pass = 0; pass < 2; pass++) {
          for (const n of NUMBERS) {
            expect(pluralCategory(locale, ordinal, n), `${locale} ${ordinal} ${n}`).toBe(
              rules.select(n),
            );
            expect(formatNumber(locale, n), `${locale} ${n}`).toBe(format.format(n));
          }
        }
      }
    }
  });

  it("does not mix locales or plural types", () => {
    expect(pluralCategory("en", false, 2)).toBe("other");
    expect(pluralCategory("en", true, 2)).toBe("two");
    expect(pluralCategory("ar", false, 2)).toBe("two");
    expect(formatNumber("ar", 3)).toBe(new Intl.NumberFormat("ar").format(3));
    expect(formatNumber("en", 3)).toBe("3");
  });

  it("formats offsets, ordinals and large counts in messages like before", () => {
    const plural =
      "{n, plural, offset:1 =0 {none} =1 {just you} one {you and # other} other {you and # others}}";
    expect(formatMessage("en", plural, { n: 0 })).toBe("none");
    expect(formatMessage("en", plural, { n: 1 })).toBe("just you");
    expect(formatMessage("en", plural, { n: 2 })).toBe("you and 1 other");
    expect(formatMessage("en", plural, { n: 3 })).toBe("you and 2 others");
    expect(formatMessage("en", plural, { n: 2000 })).toBe("you and 1,999 others");
    expect(formatMessage("ar", "{n, plural, other {#}}", { n: 7 })).toBe(
      new Intl.NumberFormat("ar").format(7),
    );
    const ordinal = "{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}";
    expect(
      [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((n) => formatMessage("en", ordinal, { n })),
    ).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "101st",
    ]);
  });
});
