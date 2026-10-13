import { describe, expect, it, vi } from "vite-plus/test";

import { createT } from "../src/translate.js";

describe("createT keeps compiled messages per path", () => {
  const en = { cart: { items: "{count, plural, one {# item} other {# items}}" } };
  const tr = { cart: { items: "{count, plural, other {# öğe}}" } };
  const de = { cart: { items: "{count, plural, one {# Artikel} other {# Artikel}}" } };
  const fr = { cart: { items: "{count} articles" } };

  it("formats the string of the dictionary it is given, whatever was called before", () => {
    const makers: Array<[string, Record<string, any>, string]> = [
      ["en", en, "3 items"],
      ["tr", tr, "3 öğe"],
      ["de", de, "3 Artikel"],
      ["fr", fr, "3 articles"],
    ];
    const ts = makers.map(([locale, dict]) => createT((name) => dict[name] ?? {}, locale) as any);
    // more locales than the two that are remembered, in turn, several times over
    for (let round = 0; round < 3; round++) {
      makers.forEach(([, , expected], i) => {
        expect(ts[i]("cart.items", { count: 3 })).toBe(expected);
      });
    }
  });

  it("follows a leaf that is replaced in place", () => {
    const dict: Record<string, any> = { box: { label: "Hello, {name}!" } };
    const t: any = createT((name) => dict[name] ?? {});
    expect(t("box.label", { name: "Ada" })).toBe("Hello, Ada!");
    dict.box.label = "Hi {name}";
    expect(t("box.label", { name: "Ada" })).toBe("Hi Ada");
    dict.box.label = "Hello, {name}!";
    expect(t("box.label", { name: "Ada" })).toBe("Hello, Ada!");
  });

  it("reports a broken message on every call, not just the first", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const t: any = createT(() => ({ bad: "{count, plural, one {x}}" }));
    expect(t("x.bad", {})).toBe("{count, plural, one {x}}");
    expect(t("x.bad", {})).toBe("{count, plural, one {x}}");
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
