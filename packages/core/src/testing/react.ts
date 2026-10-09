import { createElement, type ReactNode } from "react";

import type { DialexSource } from "../index.js";
import { DialexProvider } from "../react.js";

export interface TestDialexProviderProps extends DialexSource {
  /** Locale to render with. @default the configured default locale */
  locale?: string;
  children?: ReactNode;
}

/**
 * `DialexProvider` for component tests: renders `locale` immediately and never touches cookies or
 * localStorage, so tests do not leak state into each other.
 *
 * Give it the generated `dialex` export, or your own `dictionaries`:
 *
 * ```tsx
 * import { dialex } from "../dialex.generated";
 * render(<TestDialexProvider {...dialex} locale="tr"><Header /></TestDialexProvider>);
 * ```
 */
export function TestDialexProvider({ locale, children, ...source }: TestDialexProviderProps) {
  return createElement(DialexProvider, {
    ...source,
    initialLocale: locale,
    persist: false,
    children,
  });
}
