import { createDialexQwik } from "dialexjs/qwik";

import { dialex } from "./dialex.generated";

// Bound once, in a module of its own: the dictionaries hold functions, which Qwik cannot
// serialize, so they never become component state. Only the locale does.
export const { getPersistedLocale, setLocale, useDialex, useDialexProvider, useDictionary, useT } =
  createDialexQwik({ ...dialex });
