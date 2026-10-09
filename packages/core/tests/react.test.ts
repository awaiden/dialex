// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { DialexProvider, useDictionary, useDialex, useT } from "../src/react.js";

const home = { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } };
const dialex = {
  dictionaries: [{ name: "home", dictionary: home }],
  config: { defaultLocale: "en", locales: ["en", "tr"] },
};

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let setLocale: (l: string) => void = () => {};

function Probe() {
  const dialex = useDialex();
  const dict = useDictionary("home") as { title: string };
  const t = useT() as any;
  setLocale = dialex.setLocale;
  return createElement("p", null, `${dialex.locale}|${dict.title}|${t("home.title")}`);
}

let container: HTMLElement;
let root: Root;

const mount = async (props: Record<string, unknown> = {}) => {
  await act(async () => {
    root.render(
      createElement(DialexProvider as any, { ...dialex, ...props }, createElement(Probe)),
    );
  });
};
const text = () => container.textContent;

beforeEach(() => {
  document.cookie = "locale=; max-age=0; path=/";
  localStorage.clear();
  document.documentElement.lang = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("DialexProvider", () => {
  it("renders the default locale and sets <html lang>", async () => {
    await mount();
    expect(text()).toBe("en|Welcome|Welcome");
    expect(document.documentElement.lang).toBe("en");
  });

  it("server-renders the default first, then applies the remembered locale after mount", async () => {
    document.cookie = "locale=tr; path=/";
    const ssr = renderToString(
      createElement(DialexProvider as any, { ...dialex }, createElement(Probe)),
    );
    expect(ssr).toContain("en|Welcome");

    await mount();
    expect(text()).toBe("tr|Hoş Geldiniz|Hoş Geldiniz");
    expect(document.documentElement.lang).toBe("tr");
  });

  it("does not apply the remembered locale when initialLocale is given", async () => {
    document.cookie = "locale=tr; path=/";
    await mount({ initialLocale: "en" });
    expect(text()).toBe("en|Welcome|Welcome");
  });

  it("ignores a remembered locale that is not configured", async () => {
    document.cookie = "locale=fr; path=/";
    await mount();
    expect(text()).toBe("en|Welcome|Welcome");
  });

  it("remembers changes in a cookie by default", async () => {
    await mount();
    await act(async () => setLocale("tr"));
    expect(text()).toBe("tr|Hoş Geldiniz|Hoş Geldiniz");
    expect(document.cookie).toContain("locale=tr");
    expect(document.documentElement.lang).toBe("tr");
  });

  it("supports localStorage with a custom key, and turning persistence off", async () => {
    await mount({ persist: "localStorage", storageKey: "lng" });
    await act(async () => setLocale("tr"));
    expect(localStorage.getItem("lng")).toBe("tr");
    expect(document.cookie).not.toContain("tr");

    await act(async () => root.unmount());
    root = createRoot(container);
    localStorage.clear();
    await mount({ persist: false });
    await act(async () => setLocale("tr"));
    expect(localStorage.length).toBe(0);
    expect(text()).toBe("tr|Hoş Geldiniz|Hoş Geldiniz");
  });
});
