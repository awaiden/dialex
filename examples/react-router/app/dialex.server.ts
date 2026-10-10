import { createDialexHandler } from "dialexjs/web";

import { dialex } from "./dialex.generated";

/**
 * Finds the locale of a request: `?lang=`, then the `locale` cookie the provider writes, then
 * `Accept-Language`, then the default locale. It reads `defaultLocale`, `locales` and
 * `fallbacks` from the generated config.
 */
export const resolveDialex = createDialexHandler({ ...dialex });
