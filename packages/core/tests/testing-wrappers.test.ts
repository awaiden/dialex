// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import * as react from "../src/react.js";
import { TestDialexProvider } from "../src/testing/react.js";
import { createTestDialex } from "../src/testing/vue.js";
import * as vue from "../src/vue.js";

const home = { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } };
const dialex = {
  dictionaries: [{ name: "home", dictionary: home }],
  config: { defaultLocale: "en", locales: ["en", "tr"] },
};

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
      root.render(
        createElement(TestDialexProvider, { ...dialex, locale: "tr" }, createElement(Title)),
      );
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
      root.render(createElement(TestDialexProvider, { ...dialex }, createElement(Title)));
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
    expect(await renderToString(createSSRApp(Comp).use(createTestDialex("tr", dialex)))).toBe(
      "<p>Hoş Geldiniz</p>",
    );
    expect(await renderToString(createSSRApp(Comp).use(createTestDialex(undefined, dialex)))).toBe(
      "<p>Welcome</p>",
    );
  });
});
