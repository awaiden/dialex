import { h, render } from "preact";
// @vitest-environment jsdom
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { DialexProvider, useDialex, useDictionary, useT } from "../../src/client/preact.js";

const home = { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } };
const dialex = {
  dictionaries: [{ name: "home", dictionary: home }],
  config: { defaultLocale: "en", locales: ["en", "tr"] },
};

let setLocale: (locale: string) => void = () => {};

function Probe() {
  const context = useDialex();
  const dict = useDictionary("home") as { title: string };
  const t = useT("home") as any;
  setLocale = context.setLocale;
  return h("p", null, `${context.locale}|${dict.title}|${t("home.title")}`);
}

let container: HTMLElement;

const mount = async (props: Record<string, unknown> = {}, child = h(Probe, null)) => {
  await act(() => {
    render(h(DialexProvider as any, { ...dialex, ...props }, child), container);
  });
};

beforeEach(() => {
  document.cookie = "locale=; max-age=0; path=/";
  localStorage.clear();
  document.documentElement.lang = "";
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  await act(() => {
    render(null, container);
  });
  container.remove();
});

describe("dialexjs/preact", () => {
  it("renders the default locale and sets <html lang>", async () => {
    await mount();
    expect(container.textContent).toBe("en|Welcome|Welcome");
    expect(document.documentElement.lang).toBe("en");
  });

  it("applies the remembered locale after mount", async () => {
    document.cookie = "locale=tr; path=/";
    await mount();
    expect(container.textContent).toBe("tr|Hoş Geldiniz|Hoş Geldiniz");
    expect(document.documentElement.lang).toBe("tr");
  });

  it("does not apply the remembered locale when initialLocale is given", async () => {
    document.cookie = "locale=tr; path=/";
    await mount({ initialLocale: "en" });
    expect(container.textContent).toBe("en|Welcome|Welcome");
  });

  it("ignores a remembered locale that is not configured", async () => {
    document.cookie = "locale=fr; path=/";
    await mount();
    expect(container.textContent).toBe("en|Welcome|Welcome");
  });

  it("changes the locale, remembers it and calls onLocaleChange", async () => {
    const onLocaleChange = vi.fn();
    await mount({ onLocaleChange });

    await act(() => setLocale("tr"));

    expect(container.textContent).toBe("tr|Hoş Geldiniz|Hoş Geldiniz");
    expect(document.cookie).toContain("locale=tr");
    expect(document.documentElement.lang).toBe("tr");
    expect(onLocaleChange).toHaveBeenCalledWith("tr");
  });

  it("persists to localStorage when asked to", async () => {
    await mount({ persist: "localStorage", storageKey: "lang" });
    await act(() => setLocale("tr"));
    expect(localStorage.getItem("lang")).toBe("tr");
  });

  it("does not persist when persist is false", async () => {
    await mount({ persist: false });
    await act(() => setLocale("tr"));
    expect(document.cookie).not.toContain("locale=tr");
  });

  it("throws outside a provider", () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => render(h(Probe, null), container)).toThrow(/DialexProvider/);
    } finally {
      console.error = original;
    }
  });

  it("re-renders when a lazy dictionary arrives", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const lazy = {
      dictionaries: undefined,
      config: { ...dialex.config, lazy: true },
      loaders: {
        home: async () => {
          await gate;
          return { dictionary: home };
        },
      },
    };
    await mount(lazy as any, h(Probe, null));
    expect(container.textContent).toBe("en|undefined|home.title");

    await act(async () => {
      release();
      await gate;
    });
    await vi.waitFor(() => expect(container.textContent).toBe("en|Welcome|Welcome"));
  });

  it("keeps setLocale stable when onLocaleChange is a new function on every render", async () => {
    const seen: Array<(locale: string) => void> = [];
    function Spy() {
      seen.push(useDialex().setLocale);
      return null;
    }
    for (let i = 0; i < 2; i++) {
      await mount({ onLocaleChange: () => {} }, h(Spy, null));
    }
    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });
});
