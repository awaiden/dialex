"use client";

import { type ReactNode } from "react";
import { DialexProvider } from "dialexjs/react";

export function Providers({ children, locale = "en" }: { children: ReactNode; locale?: string }) {
  return <DialexProvider defaultLocale={locale}>{children}</DialexProvider>;
}
