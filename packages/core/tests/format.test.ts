import { describe, expect, it } from "vite-plus/test";
import { date, formatters, list, number, plural, relativeTime } from "../src/format.js";

describe("plural", () => {
  const forms = { one: "item", other: "items" };

  it("uses one/other for English", () => {
    expect(plural("en", 1, forms)).toBe("item");
    expect(plural("en", 0, forms)).toBe("items");
    expect(plural("en", 2, forms)).toBe("items");
  });

  it("treats 0 and 1 as singular in French", () => {
    expect(plural("fr", 0, forms)).toBe("item");
    expect(plural("fr", 1, forms)).toBe("item");
    expect(plural("fr", 2, forms)).toBe("items");
  });

  it("uses few/many for Russian and falls back to other", () => {
    const ru = { one: "one", few: "few", many: "many", other: "other" };
    expect(plural("ru", 1, ru)).toBe("one");
    expect(plural("ru", 3, ru)).toBe("few");
    expect(plural("ru", 5, ru)).toBe("many");
    expect(plural("ru", 1.5, ru)).toBe("other");
  });

  it("supports all six Arabic categories and falls back to other when a form is missing", () => {
    const ar = { zero: "z", one: "o", two: "t", few: "f", many: "m", other: "x" };
    expect([0, 1, 2, 3, 11, 100].map((n) => plural("ar", n, ar))).toEqual([
      "z",
      "o",
      "t",
      "f",
      "m",
      "x",
    ]);
    expect(plural("ar", 2, { other: "x" })).toBe("x");
  });

  it("keeps non-string forms typed", () => {
    expect(plural("en", 1, { one: 1, other: 2 })).toBe(1);
  });
});

describe("Intl helpers", () => {
  it("formats numbers per locale", () => {
    expect(number("en", 1234.5)).toBe("1,234.5");
    expect(number("de", 1234.5)).toBe("1.234,5");
    expect(number("en", 0.25, { style: "percent" })).toBe("25%");
  });

  it("formats dates from Date, timestamp, and ISO string", () => {
    const opts = { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" } as const;
    expect(date("en", new Date("2024-03-05T12:00:00Z"), opts)).toBe("March 5, 2024");
    expect(date("en", Date.UTC(2024, 2, 5, 12), opts)).toBe("March 5, 2024");
    expect(date("en", "2024-03-05T12:00:00Z", opts)).toBe("March 5, 2024");
  });

  it("formats relative time and lists", () => {
    expect(relativeTime("en", -1, "day", { numeric: "auto" })).toBe("yesterday");
    expect(relativeTime("en", 3, "hour")).toBe("in 3 hours");
    expect(list("en", ["a", "b", "c"])).toBe("a, b, and c");
  });

  it("binds helpers to a locale", () => {
    const f = formatters("de");
    expect(f.number(1234.5)).toBe("1.234,5");
    expect(f.plural(1, { one: "eins", other: "viele" })).toBe("eins");
    expect(f.list(["x", "y"])).toBe("x und y");
  });
});
