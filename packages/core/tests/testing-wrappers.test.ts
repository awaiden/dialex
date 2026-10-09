// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("virtual:dialex-dictionaries", () => ({
  default: { home: { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } } },
  lazy: false,
  loadDictionary: async () => undefined,
}));
vi.mock("virtual:dialex-config", () => ({
  default: { defaultLocale: "en", locales: ["en", "tr"] },
}));

const react = await import("../src/react.js");
const { TestDialexProvider } = await import("../src/testing/react.js");
const vue = await import("../src/vue.js");
const { createTestDialex } = await import("../src/testing/vue.js");

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("TestDialexProvider (React)", () => {
  function Title() {
    const dict = react.useDictionary("home") as { title: string };
    return createElement("h1", null, dict.title);
  }

  it("renders the requested locale immediately and leaves no cookies or storage behind", async () => {
    document.cookie = "locale=en; path=/"; // a stale remembered locale must be ignored
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(TestDialexProvider, { locale: "tr" }, createElement(Title)));
    });
    expect(container.textContent).toBe("Hoş Geldiniz");

    localStorage.clear();
    expect(document.cookie).toBe("locale=en");
    expect(localStorage.length).toBe(0);
    await act(async () => root.unmount());
    document.cookie = "locale=; max-age=0; path=/";
  });

  it("defaults to the configured locale", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestDialexProvider, {}, createElement(Title)));
    });
    expect(container.textContent).toBe("Welcome");
    await act(async () => root.unmount());
  });
});

describe("createTestDialex (Vue)", () => {
  const Comp = defineComponent({
    setup() {
      const dict = vue.useDictionary("home");
      return () => h("p", (dict.value as any).title);
    },
  });

  it("starts in the given locale", async () => {
    expect(await renderToString(createSSRApp(Comp).use(createTestDialex("tr")))).toBe(
      "<p>Hoş Geldiniz</p>",
    );
    expect(await renderToString(createSSRApp(Comp).use(createTestDialex()))).toBe("<p>Welcome</p>");
  });
});
