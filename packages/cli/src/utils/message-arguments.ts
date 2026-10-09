import { getArguments, parseMessage, type IcuArgument } from "dialexjs/icu";

import { listLeaves, listLocales, type DictionaryFile } from "./dictionary-edit.js";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * The TypeScript type of one ICU argument. A name can appear more than once (in a `plural` and as
 * a plain `{name}`, say); the narrowest use wins, because that is the value the message needs.
 */
function typeOfArgument(uses: IcuArgument[]): string {
  if (uses.some((u) => u.type === "plural" || u.type === "selectordinal" || u.type === "number")) {
    return "number";
  }
  if (uses.some((u) => u.type === "date" || u.type === "time")) return "Date | number";
  const select = uses.find((u) => u.type === "select");
  if (select) {
    const options = (select.selectors ?? []).filter((s) => s !== "other");
    return options.length > 0
      ? `${options.map((o) => JSON.stringify(o)).join(" | ")} | (string & {})`
      : "string";
  }
  return "string | number | boolean | Date";
}

/** `{ count: number; name: string | number | boolean | Date }` for the arguments of one message. */
export function messageType(message: string): string | undefined {
  if (!message.includes("{")) return undefined;
  let args: IcuArgument[];
  try {
    args = getArguments(parseMessage(message));
  } catch {
    return undefined; // not valid ICU; `dx check` reports it
  }
  if (args.length === 0) return undefined;

  const byName = new Map<string, IcuArgument[]>();
  for (const arg of args) byName.set(arg.name, [...(byName.get(arg.name) ?? []), arg]);
  const members = [...byName].map(
    ([name, uses]) =>
      `${IDENTIFIER.test(name) ? name : JSON.stringify(name)}: ${typeOfArgument(uses)}`,
  );
  return `{ ${members.join("; ")} }`;
}

/**
 * `dictionary.key.path` to the type of its ICU values, read from each dictionary's reference
 * locale (the default locale when the dictionary has it, otherwise its first). Other locales must
 * use the same arguments, which `dx check` verifies.
 */
export function messageArguments(
  dictionaries: (DictionaryFile | undefined)[],
  defaultLocale: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const df of dictionaries) {
    if (!df?.name) continue;
    const locales = listLocales(df);
    const reference = locales.includes(defaultLocale) ? defaultLocale : locales[0];
    if (!reference) continue;
    for (const leaf of listLeaves(df, reference)) {
      if (leaf.kind !== "string" || leaf.value === undefined) continue;
      const type = messageType(leaf.value);
      if (type) result[`${df.name}.${leaf.path.join(".")}`] = type;
    }
  }
  return result;
}
