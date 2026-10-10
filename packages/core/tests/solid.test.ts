import { createComponent, createRoot, createEffect } from "solid-js";
import { describe, expect, it, vi } from "vite-plus/test";

import { DialexProvider, useDialex, useDictionary, useT } from "../src/solid.js";

// Solid resolves to its server build under Node, where signals do not update effects. The browser
// build is what runs in an app, so the tests use it.
// @ts-expect-error the browser build ships without type declarations
vi.mock("solid-js", async () => await import("solid-js/dist/solid.js"));

const dictionaries = [
  {
    name: "home",
    dictionary: {
      en: { title: "Welcome", items: "{count, plural, one {# item} other {# items}}" },
      tr: { title: "Hoş Geldiniz", items: "{count, plural, one {# ürün} other {# ürün}}" },
    },
  },
];
const config = { defaultLocale: "en", locales: ["en", "tr"], fallbacks: {}, prefixDefault: true };

/** Runs `body` inside a provider and returns what it produced plus a disposer. */
function withProvider<T>(
  props: Record<string, unknown>,
  body: () => T,
): { value: T; dispose: () => void } {
  let value!: T;
  const dispose = createRoot((dispose) => {
    createComponent(DialexProvider as any, {
      dictionaries,
      config,
      persist: false,
      ...props,
      get children() {
        value = body();
        return undefined;
      },
    });
    return dispose;
  });
  return { value, dispose };
}

describe("dialexjs/solid", () => {
  it("reads the dictionary of the default locale", () => {
    const { value, dispose } = withProvider({}, () => useDictionary("home"));
    expect((value() as any).title).toBe("Welcome");
    dispose();
  });

  it("updates the accessor and effects when the locale changes", () => {
    const seen: string[] = [];
    const { value, dispose } = withProvider({}, () => {
      const home = useDictionary("home");
      createEffect(() => seen.push((home() as any).title));
      return useDialex();
    });

    value.setLocale("tr");

    expect(value.locale()).toBe("tr");
    expect(seen).toEqual(["Welcome", "Hoş Geldiniz"]);
    dispose();
  });

  it("translates with ICU values and follows the locale", () => {
    const { value, dispose } = withProvider({}, () => ({ t: useT("home"), dialex: useDialex() }));
    expect(value.t("home.items" as any, { count: 1 } as any)).toBe("1 item");
    value.dialex.setLocale("tr");
    expect(value.t("home.items" as any, { count: 3 } as any)).toBe("3 ürün");
    dispose();
  });

  it("prefers initialLocale and calls onLocaleChange", () => {
    const onLocaleChange = vi.fn();
    const { value, dispose } = withProvider({ initialLocale: "tr", onLocaleChange }, () =>
      useDialex(),
    );
    expect(value.locale()).toBe("tr");
    value.setLocale("en");
    expect(onLocaleChange).toHaveBeenCalledWith("en");
    dispose();
  });

  it("loads lazy dictionaries on demand", async () => {
    const loaders = { home: () => Promise.resolve({ default: dictionaries[0] }) };
    const { value, dispose } = withProvider({ dictionaries: undefined, loaders }, () =>
      useDictionary("home"),
    );
    expect((value() as any).title).toBeUndefined();
    await vi.waitFor(() => expect((value() as any).title).toBe("Welcome"));
    dispose();
  });

  it("throws a helpful error outside a provider", () => {
    expect(() => createRoot(() => useDialex())).toThrow("DialexProvider");
  });
});
