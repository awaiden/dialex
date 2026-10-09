// @vitest-environment jsdom
import { Suspense, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

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
