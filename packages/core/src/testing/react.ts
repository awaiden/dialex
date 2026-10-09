import { createElement, type ReactNode } from "react";
import { DialexProvider } from "../react.js";

export interface TestDialexProviderProps {
  /** Locale to render with. @default the configured default locale */
  locale?: string;
  children?: ReactNode;
}

/**
 * `DialexProvider` for component tests: renders `locale` immediately and never touches cookies or
 * localStorage, so tests do not leak state into each other.
 *
 * Needs the Dialex Vite plugin in your Vitest config (Vitest reads `vite.config.ts`), because
 * `useDictionary` reads the plugin's virtual modules.
 *
 * ```tsx
 * render(<TestDialexProvider locale="tr"><Header /></TestDialexProvider>);
 * ```
 */
export function TestDialexProvider({ locale, children }: TestDialexProviderProps) {
  return createElement(DialexProvider, { initialLocale: locale, persist: false, children });
}
