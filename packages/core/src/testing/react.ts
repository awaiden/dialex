import { createElement, type ReactNode } from "react";
import { I18nProvider } from "../react.js";

export interface TestI18nProviderProps {
  /** Locale to render with. @default the configured default locale */
  locale?: string;
  children?: ReactNode;
}

/**
 * `I18nProvider` for component tests: renders `locale` immediately and never touches cookies or
 * localStorage, so tests do not leak state into each other.
 *
 * Needs the Dialex Vite plugin in your Vitest config (Vitest reads `vite.config.ts`), because
 * `useDictionary` reads the plugin's virtual modules.
 *
 * ```tsx
 * render(<TestI18nProvider locale="tr"><Header /></TestI18nProvider>);
 * ```
 */
export function TestI18nProvider({ locale, children }: TestI18nProviderProps) {
  return createElement(I18nProvider, { initialLocale: locale, persist: false, children });
}
