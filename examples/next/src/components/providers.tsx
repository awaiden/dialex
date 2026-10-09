"use client";

import { type ReactNode } from "react";
import { DialexProvider } from "dialexjs/react";
// Dictionaries hold functions, so they cannot be passed from a Server Component: import them here.
import { dialex } from "../dialex.generated";

export function Providers({ children, locale = "en" }: { children: ReactNode; locale?: string }) {
  return (
    <DialexProvider {...dialex} defaultLocale={locale}>
      {children}
    </DialexProvider>
  );
}
