import { DialexProvider, useDictionary } from "dialexjs/react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { dialex } from "./dialex.generated";
import { resolveDialex } from "./dialex.server";

import "./app.css";

/** Runs on the server for the first request and again after navigations and revalidations. */
export async function loader({ request }: Route.LoaderArgs) {
  const { locale } = await resolveDialex(request);
  return { locale };
}

export function Layout({ children }: { children: React.ReactNode }) {
  // `Layout` also renders for error pages, where the loader data may be missing.
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang={data?.locale ?? "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Shell() {
  const common = useDictionary("common");
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <strong>{common.appName}</strong>
        <LanguageSwitcher />
      </header>
      <Outlet />
      <footer className="mt-12 text-center text-sm opacity-60">{common.footer}</footer>
    </div>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  // The server decides the first locale, so hydration matches the markup it rendered.
  return (
    <DialexProvider {...dialex} initialLocale={locale}>
      <Shell />
    </DialexProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
