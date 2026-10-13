import { createElement, type ReactNode } from "react";

import { DialexProvider } from "../client/react.js";
import type { DialexSource } from "../core/config.js";

/**
 * Props of `TestDialexProvider`: the generated `dialex` object (or your own dictionaries) and the locale to render with.
 */
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
