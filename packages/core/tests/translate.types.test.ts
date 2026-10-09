import { describe, expect, expectTypeOf, it } from "vite-plus/test";

import { createT, type TranslationPath } from "../src/index.js";

declare module "../src/index.js" {
  interface DictionaryRegistry extends Record<
    "home",
    {
      title: string;
      greeting: (name: string) => string;
      items: string;
      owner: string;
      nav: { about: string };
    }
  > {}

  // What `dialex generate` writes for the ICU messages above.
  interface MessageArguments {
    "home.items": { count: number };
    "home.owner": {
      name: string | number | boolean | Date;
      role: "admin" | "user" | (string & {});
    };
  }
}

describe("t() typing", () => {
  const t = createT(() => ({
    title: "Welcome",
    greeting: (n: string) => `Hi ${n}`,
    items: "{count, plural, one {# item} other {# items}}",
    owner: "{name} is {role, select, admin {an admin} other {a user}}",
    nav: { about: "About" },
  }));

  it("restricts paths to registry leaves", () => {
    expectTypeOf<TranslationPath>().toEqualTypeOf<
      "home.title" | "home.greeting" | "home.items" | "home.owner" | "home.nav.about"
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

  it("checks ICU values against the generated MessageArguments", () => {
    expectTypeOf(t("home.owner", { name: "Ada", role: "admin" })).toEqualTypeOf<string>();
    // @ts-expect-error a message with arguments needs its values
    t("home.items");
    // @ts-expect-error the argument is called count
    t("home.items", { total: 2 });
    // @ts-expect-error count is a number
    t("home.items", { count: "2" });
    // @ts-expect-error role is missing
    t("home.owner", { name: "Ada" });
    // other select values are still allowed
    t("home.owner", { name: "Ada", role: "guest" });
    // strings without ICU arguments stay optional-values
    expect(t("home.title")).toBe("Welcome");
    expect(t("home.nav.about", {})).toBe("About");
  });
});
