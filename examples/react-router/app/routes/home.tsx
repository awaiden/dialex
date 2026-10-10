import { useDialex, useDictionary, useT } from "dialexjs/react";
import { Link } from "react-router";

import { resolveDialex } from "../dialex.server";
import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData?.title ?? "Dialex + React Router" }];
}

/** A server-side use of the same dictionaries, here for the page title. */
export async function loader({ request }: Route.LoaderArgs) {
  const { getDictionary } = await resolveDialex(request);
  return { title: getDictionary("home").title as string };
}

export default function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const { locale } = useDialex();

  return (
    <>
      <h1 className="text-3xl font-bold">{home.title}</h1>
      <p className="mt-2 opacity-70">{home.subtitle}</p>
      <p className="mt-6">{home.greeting("Alex")}</p>
      <p className="mt-2">{t("home.role", { role: "admin" })}</p>
      <p className="mt-6 text-sm opacity-60">locale: {locale}</p>
      <Link className="mt-6 inline-block underline" to="/cart">
        {home.cart.title}
      </Link>
    </>
  );
}
