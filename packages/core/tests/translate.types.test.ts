import { describe, expect, expectTypeOf, it } from "vite-plus/test";
import { createT, type TranslationPath } from "../src/index.js";

declare module "../src/index.js" {
  interface DictionaryRegistry extends Record<
    "home",
    {
      title: string;
      greeting: (name: string) => string;
      items: string;
      nav: { about: string };
    }
  > {}
}

describe("t() typing", () => {
  const t = createT(() => ({
    title: "Welcome",
    greeting: (n: string) => `Hi ${n}`,
    items: "{count, plural, one {# item} other {# items}}",
    nav: { about: "About" },
  }));

  it("restricts paths to registry leaves", () => {
    expectTypeOf<TranslationPath>().toEqualTypeOf<
      "home.title" | "home.greeting" | "home.items" | "home.nav.about"
    >();
    expect(t("home.title")).toBe("Welcome");
  });

  it("infers argument and result types from the leaf", () => {
    expectTypeOf(t("home.title")).toEqualTypeOf<string>();
    expectTypeOf(t("home.greeting", "Ada")).toEqualTypeOf<string>();
    expectTypeOf(t("home.items", { count: 2 })).toEqualTypeOf<string>();
    // @ts-expect-error string leaves accept an ICU values object, not a bare number
    t("home.items", 2);
    // @ts-expect-error greeting requires a string argument
    t("home.greeting", 42);
    // @ts-expect-error unknown path
    t("home.nope");
  });
});
