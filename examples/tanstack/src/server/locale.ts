import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createDialexHandler } from "dialexjs/web";
import dictionaries from "../dialex.generated";

const resolveDialex = createDialexHandler({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

/** Detects the locale from the incoming request: path, query, `locale` cookie, Accept-Language. */
export const getLocale = createServerFn({ method: "GET" }).handler(async () => {
  const { locale } = await resolveDialex(getRequest());
  return locale;
});
