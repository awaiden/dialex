import { HeadContent, Scripts, createRootRoute, Outlet } from "@tanstack/react-router";
import { DialexProvider, useDictionary } from "dialexjs/react";
import { Header } from "../components/Header";
import { dialex } from "../dialex.generated";
import { getLocale } from "../server/locale";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  // Runs on the server for the first request, so the HTML is rendered in the right language.
  beforeLoad: async () => ({ locale: await getLocale() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dialex + TanStack Start" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { locale } = Route.useRouteContext();
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <DialexProvider {...dialex} initialLocale={locale}>
          {children}
        </DialexProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const common = useDictionary("common");
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <footer className="footer">{common.footer}</footer>
    </>
  );
}
