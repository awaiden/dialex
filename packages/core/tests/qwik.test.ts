// @vitest-environment jsdom
import { componentQrl, inlinedQrl, jsx, Slot } from "@builder.io/qwik";
import { renderToString } from "@builder.io/qwik/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createDialexQwik } from "../src/qwik.js";

const home = {
  en: { title: "Welcome", items: "{count, plural, one {# item} other {# items}}" },
  tr: { title: "Hoş Geldiniz", items: "{count, plural, other {# ürün}}" },
};
const source = {
  dictionaries: [{ name: "home", dictionary: home }],
  config: { defaultLocale: "en", locales: ["en", "tr"] },
};

beforeEach(() => {
  document.cookie = "locale=; max-age=0; path=/";
  document.documentElement.lang = "";
});

/** Renders `<Root><Child/></Root>` on the server the way Qwik City would. */
async function render(dx: ReturnType<typeof createDialexQwik>, initialLocale?: string) {
  const Child = componentQrl(
    inlinedQrl(() => {
      const state = dx.useDialex();
      const dict = dx.useDictionary("home") as unknown as () => { title: string };
      const t = dx.useT() as any;
      return jsx("p", {
        children: `${state.locale}|${dict().title}|${t("home.items", { count: 2 })}`,
      });
    }, "Child_onMount"),
  );
  const Root = componentQrl(
    inlinedQrl(() => {
      dx.useDialexProvider({ initialLocale });
      return jsx(Slot, {});
    }, "Root_onMount"),
  );
  const { html } = await renderToString(jsx(Root, { children: jsx(Child, {}) }), {
    containerTagName: "div",
  });
  return html;
}

describe("dialexjs/qwik", () => {
  it("renders the default locale", async () => {
    const html = await render(createDialexQwik({ ...source }));
    expect(html).toContain("en|Welcome|2 items");
  });

  it("renders the locale the server resolved", async () => {
    const html = await render(createDialexQwik({ ...source }), "tr");
    expect(html).toContain("tr|Hoş Geldiniz|2 ürün");
  });

  it("keeps the dictionaries out of the serialized state", async () => {
    const html = await render(createDialexQwik({ ...source }), "tr");
    const state = html.match(/<script type="qwik\/json">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(state).not.toContain("Welcome");
    expect(state).not.toContain("Hoş Geldiniz");
  });

  it("getPersistedLocale returns the remembered locale only when it is supported", () => {
    const dx = createDialexQwik({ ...source });
    expect(dx.getPersistedLocale()).toBeUndefined();

    document.cookie = "locale=tr; path=/";
    expect(dx.getPersistedLocale()).toBe("tr");

    document.cookie = "locale=fr; path=/";
    expect(dx.getPersistedLocale()).toBeUndefined();
  });

  it("setLocale updates the state, the cookie and <html lang>", () => {
    const dx = createDialexQwik({ ...source });
    const state = { locale: "en", loaded: 0 };

    dx.setLocale(state, "tr");

    expect(state.locale).toBe("tr");
    expect(document.cookie).toContain("locale=tr");
    expect(document.documentElement.lang).toBe("tr");
  });

  it("setLocale persists to localStorage with the given key", () => {
    localStorage.clear();
    const dx = createDialexQwik({ ...source, persist: "localStorage", storageKey: "lang" });
    dx.setLocale({ locale: "en", loaded: 0 }, "tr");
    expect(localStorage.getItem("lang")).toBe("tr");
  });

  it("setLocale does not persist when persist is false", () => {
    const dx = createDialexQwik({ ...source, persist: false });
    dx.setLocale({ locale: "en", loaded: 0 }, "tr");
    expect(document.cookie).not.toContain("locale=tr");
  });

  it("loads lazy dictionaries on first read and counts the finished load", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const dx = createDialexQwik({
      config: { ...source.config, lazy: true },
      loaders: {
        home: async () => {
          await gate;
          return { dictionary: home };
        },
      },
    });
    const state = { locale: "en", loaded: 0 };
    const context = { useContext: () => state };
    // The hooks only need the provider state, so a stand-in context is enough here.
    const qwik = await import("@builder.io/qwik");
    const spy = vi.spyOn(qwik, "useContext").mockImplementation(context.useContext as any);
    try {
      const dict = dx.useDictionary("home") as unknown as () => { title?: string };
      expect(dict().title).toBeUndefined();
      expect(state.loaded).toBe(0);

      release();
      await vi.waitFor(() => expect(state.loaded).toBeGreaterThan(0));
      expect(dx.useDictionary("home")()).toEqual(home.en);
    } finally {
      spy.mockRestore();
    }
  });
});
