import { createDialex } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

// One instance for the whole app, so every element shares the locale.
export const i18n = createDialex({ ...dialex });
