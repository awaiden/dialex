"use client";

import { type ReactNode } from "react";
import { I18nProvider } from "dialexjs/react";

export function Providers({ children, locale = "en" }: { children: ReactNode; locale?: string }) {
  return <I18nProvider defaultLocale={locale}>{children}</I18nProvider>;
}
