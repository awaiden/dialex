// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { readPersistedLocale, syncDocumentLang, writePersistedLocale } from "../src/persist.js";

beforeEach(() => {
  document.cookie = "locale=; max-age=0; path=/";
  localStorage.clear();
  document.documentElement.lang = "";
});

describe("persisted locale", () => {
  it("round-trips through a cookie", () => {
    expect(readPersistedLocale("cookie", "locale")).toBeUndefined();
    writePersistedLocale("cookie", "locale", "pt-BR");
    expect(readPersistedLocale("cookie", "locale")).toBe("pt-BR");
    expect(document.cookie).toContain("locale=pt-BR");
  });

  it("round-trips through localStorage with a custom key", () => {
    writePersistedLocale("localStorage", "lng", "tr");
    expect(localStorage.getItem("lng")).toBe("tr");
    expect(readPersistedLocale("localStorage", "lng")).toBe("tr");
  });

  it("does nothing when persistence is off", () => {
    writePersistedLocale(false, "locale", "tr");
    expect(document.cookie).toBe("");
    expect(localStorage.length).toBe(0);
    expect(readPersistedLocale(false, "locale")).toBeUndefined();
  });

  it("ignores blocked storage and malformed cookies", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readPersistedLocale("localStorage", "locale")).toBeUndefined();
    spy.mockRestore();

    document.cookie = "locale=%E0%A4%A; path=/";
    expect(readPersistedLocale("cookie", "locale")).toBeUndefined();
  });

  it("syncs <html lang>", () => {
    syncDocumentLang("tr");
    expect(document.documentElement.lang).toBe("tr");
  });
});
