import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "../dialex.generated";

const resolveDialex = createDialexHandler({ ...dialex });

/** Detects the locale from the incoming request: path, query, `locale` cookie, Accept-Language. */
export const getLocale = createServerFn({ method: "GET" }).handler(async () => {
  const { locale } = await resolveDialex(getRequest());
  return locale;
});
