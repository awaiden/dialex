import { describe, expect, it } from "vite-plus/test";

import { formatMessage } from "../src/icu/index.js";
import { dateTimeFormat, numberFormat, pluralRules } from "../src/intl.js";

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
