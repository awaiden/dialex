// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createDialex, DialexController } from "../../src/client/lit.js";

const dictionaries = [
  {
    name: "home",
    dictionary: {
      en: { title: "Welcome", items: "{count, plural, one {# item} other {# items}}" },
      tr: { title: "Hoş Geldiniz", items: "{count, plural, other {# ürün}}" },
    },
  },
];
const config = { defaultLocale: "en", locales: ["en", "tr"] };

beforeEach(() => {
  document.cookie = "locale=; max-age=0; path=/";
  localStorage.clear();
  document.documentElement.lang = "";
});

function host() {
  const controllers: any[] = [];
  return {
    controllers,
    addController: (controller: any) => controllers.push(controller),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe("dialexjs/lit", () => {
  it("starts with the default locale and sets <html lang>", () => {
    const dialex = createDialex({ dictionaries, config });
    expect(dialex.locale).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect((dialex.getDictionary("home") as any).title).toBe("Welcome");
  });

  it("applies the remembered locale, and ignores one that is not configured", () => {
    document.cookie = "locale=tr; path=/";
    expect(createDialex({ dictionaries, config }).locale).toBe("tr");

    document.cookie = "locale=fr; path=/";
    expect(createDialex({ dictionaries, config }).locale).toBe("en");
  });

  it("prefers initialLocale over the remembered one", () => {
    document.cookie = "locale=tr; path=/";
    expect(createDialex({ dictionaries, config, initialLocale: "en" }).locale).toBe("en");
  });

  it("changes the locale, remembers it, notifies and syncs <html lang>", () => {
    const onLocaleChange = vi.fn();
    const dialex = createDialex({ dictionaries, config, onLocaleChange });
    const listener = vi.fn();
    dialex.subscribe(listener);

    dialex.setLocale("tr");

    expect(dialex.locale).toBe("tr");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(onLocaleChange).toHaveBeenCalledWith("tr");
    expect(document.cookie).toContain("locale=tr");
    expect(document.documentElement.lang).toBe("tr");
    expect((dialex.getDictionary("home") as any).title).toBe("Hoş Geldiniz");
  });

  it("does not notify when the locale stays the same", () => {
    const dialex = createDialex({ dictionaries, config, persist: false });
    const listener = vi.fn();
    dialex.subscribe(listener);
    dialex.setLocale("en");
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const dialex = createDialex({ dictionaries, config, persist: false });
    const listener = vi.fn();
    const unsubscribe = dialex.subscribe(listener);
    unsubscribe();
    dialex.setLocale("tr");
    expect(listener).not.toHaveBeenCalled();
  });

  it("translates with ICU values and follows the locale", () => {
    const dialex = createDialex({ dictionaries, config, persist: false });
    const t = dialex.t("home") as any;
    expect(t("home.items", { count: 1 })).toBe("1 item");
    dialex.setLocale("tr");
    expect(t("home.items", { count: 3 })).toBe("3 ürün");
  });

  it("loads lazy dictionaries and notifies when they arrive", async () => {
    const dialex = createDialex({
      config: { ...config, lazy: true },
      loaders: { home: async () => ({ dictionary: dictionaries[0].dictionary }) },
      persist: false,
    });
    const listener = vi.fn();
    dialex.subscribe(listener);

    expect(dialex.getDictionary("home")).toEqual({});
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    expect((dialex.getDictionary("home") as any).title).toBe("Welcome");
  });

  it("logs a failed lazy load instead of leaving an unhandled rejection", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const dialex = createDialex({
        config: { ...config, lazy: true },
        loaders: {
          home: async () => {
            throw new Error("network");
          },
        },
        persist: false,
      });
      dialex.getDictionary("home");
      await vi.waitFor(() => expect(error).toHaveBeenCalled());
      expect(String(error.mock.calls[0][0])).toContain('Could not load dictionary "home"');
    } finally {
      error.mockRestore();
    }
  });

  describe("DialexController", () => {
    it("registers with the host and requests an update on locale changes", () => {
      const dialex = createDialex({ dictionaries, config, persist: false });
      const h = host();
      const controller = new DialexController(h as any, dialex);
      expect(h.controllers).toEqual([controller]);

      controller.hostConnected();
      controller.setLocale("tr");
      expect(h.requestUpdate).toHaveBeenCalledTimes(1);
      expect(controller.locale).toBe("tr");
      expect((controller.dictionary("home") as any).title).toBe("Hoş Geldiniz");

      controller.hostDisconnected();
      controller.setLocale("en");
      expect(h.requestUpdate).toHaveBeenCalledTimes(1);
    });

    it("subscribes once when connected again", () => {
      const dialex = createDialex({ dictionaries, config, persist: false });
      const h = host();
      const controller = new DialexController(h as any, dialex);
      controller.hostConnected();
      controller.hostConnected();
      dialex.setLocale("tr");
      expect(h.requestUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
