// @vitest-environment jsdom
import { Suspense, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

// A lazy dictionary registry whose loads are resolved by the test.
const state = vi.hoisted(() => ({
  dictionaries: {} as Record<string, any>,
  releases: {} as Record<string, () => void>,
  loads: [] as string[],
}));

vi.mock("virtual:dialex-dictionaries", () => {
  const pending: Record<string, Promise<any>> = {};
  return {
    default: state.dictionaries,
    lazy: true,
    loadDictionary: (name: string) => {
      if (!pending[name]) {
        state.loads.push(name);
        pending[name] = new Promise((resolve) => {
          state.releases[name] = () => {
            state.dictionaries[name] = { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } };
            resolve(state.dictionaries[name]);
          };
        });
      }
      return pending[name];
    },
  };
});
vi.mock("virtual:dialex-config", () => ({
  default: { defaultLocale: "en", locales: ["en", "tr"] },
}));

const react = await import("../src/react.js");
const vue = await import("../src/vue.js");

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
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          react.I18nProvider as any,
          { persist: false },
          createElement(
            Suspense,
            { fallback: createElement("p", null, "loading") },
            createElement(Title),
          ),
        ),
      );
    });
    expect(container.textContent).toBe("loading");
    expect(state.loads).toContain("lazy-react");

    await act(async () => state.releases["lazy-react"]());
    expect(container.textContent).toBe("Welcome");
    await act(async () => root.unmount());
  });

  it("loads dictionaries named in useT and exposes preloadDictionaries", async () => {
    function Greeting() {
      const t = react.useT("lazy-t") as any;
      return createElement("h1", null, t("lazy-t.title"));
    }
    const root = createRoot(container);
    const preload = react.preloadDictionaries("lazy-t");
    await act(async () => {
      root.render(
        createElement(
          react.I18nProvider as any,
          { persist: false },
          createElement(Suspense, { fallback: "loading" }, createElement(Greeting)),
        ),
      );
    });
    expect(container.textContent).toBe("loading");

    await act(async () => state.releases["lazy-t"]());
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
    const app = createSSRApp(Comp("lazy-vue-ssr")).use(vue.createI18n({ defaultLocale: "tr" }));
    const html = renderToString(app);
    await vi.waitFor(() => expect(state.releases["lazy-vue-ssr"]).toBeTypeOf("function"));
    state.releases["lazy-vue-ssr"]();
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
    const app = createSSRApp(Probe).use(vue.createI18n());
    const el = document.createElement("div");
    app.mount(el);

    expect(dictRef.value.value).toEqual({});
    state.releases["lazy-vue-client"]();
    await vi.waitFor(() => expect(dictRef.value.value).toEqual({ title: "Welcome" }));
    await nextTick();
  });
});
