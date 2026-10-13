/** Where a client-side locale choice is remembered. */
export type PersistMode = "cookie" | "localStorage" | false;

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Reads a remembered locale. Safe on the server and when storage is blocked. */
export function readPersistedLocale(mode: PersistMode, key: string): string | undefined {
  try {
    if (mode === "cookie" && typeof document !== "undefined") {
      for (const pair of document.cookie.split(";")) {
        const [name, ...value] = pair.trim().split("=");
        if (name === key) return decodeURIComponent(value.join("="));
      }
    } else if (mode === "localStorage" && typeof localStorage !== "undefined") {
      return localStorage.getItem(key) ?? undefined;
    }
  } catch {
    // Storage can be blocked or the cookie malformed; behave as if nothing was stored.
  }
  return undefined;
}

/** Remembers a locale. Does nothing on the server or when storage is blocked. */
export function writePersistedLocale(mode: PersistMode, key: string, locale: string): void {
  try {
    if (mode === "cookie" && typeof document !== "undefined") {
      document.cookie = `${key}=${encodeURIComponent(locale)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    } else if (mode === "localStorage" && typeof localStorage !== "undefined") {
      localStorage.setItem(key, locale);
    }
  } catch {
    // Ignore: persistence is a convenience.
  }
}

/** Keeps `<html lang>` in sync with the active locale. */
export function syncDocumentLang(locale: string): void {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}
