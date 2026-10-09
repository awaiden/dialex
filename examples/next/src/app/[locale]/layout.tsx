import type { ReactNode } from "react";

import { Providers } from "../../components/providers";

export const metadata = {
  title: "Next.js i18n Example",
  description: "Next.js App Router path-based i18n example with dialex",
};

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "tr" }];
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale}>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: "800px",
          margin: "2rem auto",
          padding: "0 1rem",
        }}
      >
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
