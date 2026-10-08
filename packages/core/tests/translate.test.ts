import { describe, expect, it, vi } from "vite-plus/test";
import { createT } from "../src/translate.js";

describe("createT", () => {
  const dictionaries: Record<string, any> = {
    home: {
      title: "Welcome",
      greeting: (name: string) => `Hello, ${name}!`,
      nav: { about: "About", deep: { leaf: "Leaf" } },
    },
  };
  const t: any = createT((name) => dictionaries[name] ?? {});

  it("reads string leaves by dot path", () => {
    expect(t("home.title")).toBe("Welcome");
    expect(t("home.nav.about")).toBe("About");
    expect(t("home.nav.deep.leaf")).toBe("Leaf");
  });

  it("calls function leaves with the remaining arguments", () => {
    expect(t("home.greeting", "Ada")).toBe("Hello, Ada!");
  });

  it("warns and returns the path for unknown paths", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(t("home.missing")).toBe("home.missing");
    expect(t("nope.title")).toBe("nope.title");
    expect(t("home.title.deeper")).toBe("home.title.deeper");
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
});

describe("createT with ICU messages", () => {
  const dictionaries: Record<string, any> = {
    cart: {
      title: "Your cart",
      items: "{count, plural, =0 {No items} one {# item} other {# items}}",
      owner: "Hello, {name}!",
      braces: "Use {braces} sparingly",
      broken: "{count, plural, one {x}}",
      greet: (n: string) => `Hi ${n}`,
    },
  };
  const t: any = createT((name) => dictionaries[name] ?? {}, "en");

  it("formats string leaves when a values object is passed", () => {
    expect(t("cart.items", { count: 0 })).toBe("No items");
    expect(t("cart.items", { count: 5 })).toBe("5 items");
    expect(t("cart.owner", { name: "Ada" })).toBe("Hello, Ada!");
  });

  it("uses the locale it was created with", () => {
    const de: any = createT((name) => dictionaries[name] ?? {}, "de");
    expect(de("cart.items", { count: 1234 })).toBe("1.234 items");
  });

  it("returns the raw string when no values are passed (backward compatible)", () => {
    expect(t("cart.title")).toBe("Your cart");
    expect(t("cart.owner")).toBe("Hello, {name}!");
    expect(t("cart.braces")).toBe("Use {braces} sparingly");
  });

  it("warns and returns the raw string when formatting fails", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(t("cart.owner", {})).toBe("Hello, {name}!");
    expect(t("cart.broken", { count: 1 })).toBe("{count, plural, one {x}}");
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain('Could not format "cart.owner"');
    warn.mockRestore();
  });

  it("still forwards arguments to function leaves", () => {
    expect(t("cart.greet", "Ada")).toBe("Hi Ada");
  });
});
