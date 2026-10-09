import { createDialexServer } from "dialexjs/server";

import { dialex } from "./dialex.generated";

/** Server-side helpers bound to the generated dictionaries and config. */
export const { getDictionary, getT } = createDialexServer(dialex);
