// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { DialexProvider, useDialex, useDictionary, useT } from "../src/react-native.js";

const home = { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } };
const dialex = {
  dictionaries: [{ name: "home", dictionary: home }],
  config: { defaultLocale: "en", locales: ["en", "tr"] },
};

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let setLocale: (locale: string) => void = () => {};

function Probe() {
  const context = useDialex();
  const dict = useDictionary("home") as { title: string };
  const t = useT() as any;
  setLocale = context.setLocale;
  return createElement("p", null, `${context.locale}|${dict.title}|${t("home.title")}`);
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: vi.fn(async (key: string) => data[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data[key] = value;
    }),
  };
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
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("dialexjs/react-native", () => {
  it("renders the default locale without a document-based persistence", async () => {
    await mount();
    expect(text()).toBe("en|Welcome|Welcome");
  });

  it("starts with the first device locale the app supports", async () => {
    await mount({ deviceLocales: ["fr-FR", "tr-TR", "en-US"] });
    expect(text()).toBe("tr|Hoş Geldiniz|Hoş Geldiniz");
  });

  it("falls back to the default when no device locale is supported", async () => {
    await mount({ deviceLocales: "fr-FR" });
    expect(text()).toBe("en|Welcome|Welcome");
  });

  it("applies the locale remembered in storage over the device locale", async () => {
    const storage = memoryStorage({ locale: "en" });
    await mount({ deviceLocales: ["tr"], storage });
    expect(storage.getItem).toHaveBeenCalledWith("locale");
    expect(text()).toBe("en|Welcome|Welcome");
  });

  it("ignores a remembered locale that is not configured", async () => {
    await mount({ storage: memoryStorage({ locale: "fr" }) });
    expect(text()).toBe("en|Welcome|Welcome");
  });

  it("writes the choice to storage and calls onLocaleChange", async () => {
    const storage = memoryStorage();
    const onLocaleChange = vi.fn();
    await mount({ storage, storageKey: "lang", onLocaleChange });

    await act(async () => setLocale("tr"));

    expect(text()).toBe("tr|Hoş Geldiniz|Hoş Geldiniz");
    expect(storage.data.lang).toBe("tr");
    expect(onLocaleChange).toHaveBeenCalledWith("tr");
  });

  it("does not touch the document cookie", async () => {
    await mount({ storage: memoryStorage() });
    await act(async () => setLocale("tr"));
    expect(document.cookie).not.toContain("locale=tr");
  });

  it("keeps working when the storage fails", async () => {
    const storage = {
      getItem: vi.fn(async () => {
        throw new Error("denied");
      }),
      setItem: vi.fn(async () => {
        throw new Error("denied");
      }),
    };
    await mount({ storage });
    await act(async () => setLocale("tr"));
    expect(text()).toBe("tr|Hoş Geldiniz|Hoş Geldiniz");
  });

  it("does not read the storage when initialLocale is given", async () => {
    const storage = memoryStorage({ locale: "tr" });
    await mount({ storage, initialLocale: "en" });
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(text()).toBe("en|Welcome|Welcome");
  });
});
