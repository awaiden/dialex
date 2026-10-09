// @vitest-environment jsdom
import { Suspense, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import * as react from "../src/react.js";
import * as vue from "../src/vue.js";

const dictionary = { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } };

/** A lazy `dialex` source whose loads are resolved by the test. */
function lazySource(...names: string[]) {
  const releases: Record<string, () => void> = {};
  const loads: string[] = [];
  const loaders = Object.fromEntries(
    names.map((name) => [
      name,
      () => {
        loads.push(name);
        return new Promise((resolve) => {
          releases[name] = () => resolve({ default: { name, dictionary } });
        });
      },
    ]),
  );
  return {
    source: { loaders, config: { defaultLocale: "en", locales: ["en", "tr"], lazy: true } },
    releases,
    loads,
  };
}

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("lazy dictionaries in React", () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  function Title() {
    const dict = react.useDictionary("lazy-react") as { title: string };
    return createElement("h1", null, dict.title);
  }

  it("suspends until the dictionary has loaded", async () => {
    const lazy = lazySource("lazy-react");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          react.DialexProvider as any,
          { ...lazy.source, persist: false },
          createElement(
            Suspense,
            { fallback: createElement("p", null, "loading") },
            createElement(Title),
          ),
        ),
      );
    });
    expect(container.textContent).toBe("loading");
    expect(lazy.loads).toContain("lazy-react");

    await act(async () => lazy.releases["lazy-react"]());
    expect(container.textContent).toBe("Welcome");
    await act(async () => root.unmount());
  });

  it("loads dictionaries named in useT and exposes preloadDictionaries", async () => {
    function Greeting() {
      const t = react.useT("lazy-t") as any;
      return createElement("h1", null, t("lazy-t.title"));
    }
    const lazy = lazySource("lazy-t");
    const root = createRoot(container);
    const preload = react.preloadDictionaries(lazy.source, "lazy-t");
    await act(async () => {
      root.render(
        createElement(
          react.DialexProvider as any,
          { ...lazy.source, persist: false },
          createElement(Suspense, { fallback: "loading" }, createElement(Greeting)),
        ),
      );
    });
    expect(container.textContent).toBe("loading");

    await act(async () => lazy.releases["lazy-t"]());
    await preload;
    expect(container.textContent).toBe("Welcome");
    await act(async () => root.unmount());
  });
});

describe("lazy dictionaries in Vue", () => {
  const Comp = (name: string) =>
    defineComponent({
      setup() {
        const dict = vue.useDictionary(name);
        return () => h("p", (dict.value as any).title ?? "empty");
      },
    });

  it("server-side rendering waits for the dictionary", async () => {
    const lazy = lazySource("lazy-vue-ssr");
    const app = createSSRApp(Comp("lazy-vue-ssr")).use(
      vue.createDialex({ ...lazy.source, defaultLocale: "tr" }),
    );
    const html = renderToString(app);
    await vi.waitFor(() => expect(lazy.releases["lazy-vue-ssr"]).toBeTypeOf("function"));
    lazy.releases["lazy-vue-ssr"]();
    expect(await html).toBe("<p>Hoş Geldiniz</p>");
  });

  it("updates reactively after the dictionary loads on the client", async () => {
    const dictRef = { value: undefined as any };
    const Probe = defineComponent({
      setup() {
        dictRef.value = vue.useDictionary("lazy-vue-client");
        return () => h("p");
      },
    });
    const lazy = lazySource("lazy-vue-client");
    const app = createSSRApp(Probe).use(vue.createDialex(lazy.source));
    const el = document.createElement("div");
    app.mount(el);

    expect(dictRef.value.value).toEqual({});
    lazy.releases["lazy-vue-client"]();
    await vi.waitFor(() => expect(dictRef.value.value).toEqual({ title: "Welcome" }));
    await nextTick();
  });
});

/** A per-locale lazy source whose downloads are released by the test. */
function perLocaleSource(name: string) {
  const releases: Record<string, () => void> = {};
  const loads: string[] = [];
  const content: Record<string, Record<string, string>> = {
    en: { title: "Welcome" },
    tr: { title: "Hoş Geldiniz" },
  };
  const loaders = {
    [name]: Object.fromEntries(
      Object.keys(content).map((locale) => [
        locale,
        () => {
          loads.push(locale);
          return new Promise((resolve) => {
            releases[locale] = () => resolve({ default: content[locale] });
          });
        },
      ]),
    ),
  };
  return {
    source: {
      loaders,
      config: { defaultLocale: "en", locales: ["en", "tr"], lazy: "locale" as const },
    },
    releases,
    loads,
  };
}

describe("per-locale lazy dictionaries", () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  it("React keeps the current language on screen until the new one has downloaded", async () => {
    const lazy = perLocaleSource("pl-react");
    let setLocale: (l: string) => void = () => {};
    function Title() {
      const dict = react.useDictionary("pl-react") as { title: string };
      setLocale = react.useDialex().setLocale;
      return createElement("h1", null, dict.title);
    }
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          react.DialexProvider as any,
          { ...lazy.source, persist: false, initialLocale: "en" },
          createElement(Suspense, { fallback: "loading" }, createElement(Title)),
        ),
      );
    });
    expect(container.textContent).toBe("loading");
    expect(lazy.loads).toEqual(["en"]); // Turkish is not downloaded for an English visitor

    await act(async () => lazy.releases.en());
    expect(container.textContent).toBe("Welcome");

    await act(async () => setLocale("tr"));
    expect(lazy.loads).toEqual(["en", "tr"]);
    expect(container.textContent).toBe("Welcome"); // still English: Turkish is in flight, no flash of "loading"

    await act(async () => lazy.releases.tr());
    expect(container.textContent).toBe("Hoş Geldiniz");
    await act(async () => root.unmount());
  });

  it("Vue server-side rendering downloads only the requested locale", async () => {
    const lazy = perLocaleSource("pl-vue");
    const app = createSSRApp(
      defineComponent({
        setup() {
          const dict = vue.useDictionary("pl-vue");
          return () => h("p", (dict.value as any).title ?? "empty");
        },
      }),
    ).use(vue.createDialex({ ...lazy.source, defaultLocale: "tr" }));
    const html = renderToString(app);
    await vi.waitFor(() => expect(lazy.releases.tr).toBeTypeOf("function"));
    lazy.releases.tr();
    expect(await html).toBe("<p>Hoş Geldiniz</p>");
    expect(lazy.loads).toEqual(["tr"]);
  });

  it("Vue loads the other locale when the locale changes", async () => {
    const lazy = perLocaleSource("pl-vue-switch");
    const dictRef = { value: undefined as any };
    const dialex = vue.createDialex({ ...lazy.source, defaultLocale: "en" });
    const Probe = defineComponent({
      setup() {
        dictRef.value = vue.useDictionary("pl-vue-switch");
        return () => h("p");
      },
    });
    const app = createSSRApp(Probe).use(dialex);
    app.mount(document.createElement("div"));

    lazy.releases.en();
    await vi.waitFor(() => expect(dictRef.value.value).toEqual({ title: "Welcome" }));

    dialex.setLocale("tr");
    await vi.waitFor(() => expect(lazy.releases.tr).toBeTypeOf("function"));
    expect(dictRef.value.value).toEqual({}); // not Turkish yet, and not English shown as a fallback
    lazy.releases.tr();
    await vi.waitFor(() => expect(dictRef.value.value).toEqual({ title: "Hoş Geldiniz" }));
    await nextTick();
  });
});
