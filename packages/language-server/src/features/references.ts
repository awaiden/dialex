import { scanReferences, type AnalyzedDictionary, type Reference } from "@dialexjs/cli/api";

import type { Bindings } from "./bindings.js";
import type { ProjectModel } from "./model.js";

/** `getDictionary("home").nav.about` -> the `.nav.about` member chain after the call. */
const MEMBER_CHAIN =
  /(?:getDictionary|useDictionary)\(\s*(["'`])([^"'`$\n]+)\1[^()\n]*\)((?:\??\.[A-Za-z_$][\w$]*)+)/dg;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The Dialex reference under the cursor on one line of code: a dictionary name, a `t("a.b.c")`
 * path, a member of `getDictionary("a")` such as `.title`, or, with `bindings`, a member of a
 * variable that holds a dictionary (`s.nav.features` after `const s = useDictionary("showcase")`).
 * Offsets are into `lineText`.
 */
export function findReferenceAt(
  lineText: string,
  character: number,
  bindings?: Bindings,
): Reference | undefined {
  const direct = scanReferences(lineText).find((r) => character >= r.start && character <= r.end);
  if (direct) return direct;

  for (const match of lineText.matchAll(MEMBER_CHAIN)) {
    const dictionary = match[2];
    const [chainStart] = match.indices![3] as [number, number];
    const members = /\??\.([A-Za-z_$][\w$]*)/g;
    const keys: string[] = [];
    for (const member of match[3].matchAll(members)) {
      const start = chainStart + member.index! + member[0].length - member[1].length;
      const end = start + member[1].length;
      keys.push(member[1]);
      if (character >= start && character <= end) {
        return { kind: "path", value: [dictionary, ...keys].join("."), start, end };
      }
    }
  }

  for (const [name, dictionary] of bindings ?? []) {
    const chain = new RegExp(
      `(?<![\\w$.])${escapeRegExp(name)}(?![\\w$])((?:\\??\\.[A-Za-z_$][\\w$]*)*)`,
      "dg",
    );
    for (const match of lineText.matchAll(chain)) {
      const nameStart = match.index!;
      const nameEnd = nameStart + name.length;
      if (character >= nameStart && character <= nameEnd) {
        return { kind: "dictionary", value: dictionary, start: nameStart, end: nameEnd };
      }

      const [chainStart] = match.indices![1] as [number, number];
      const keys: string[] = [];
      for (const member of match[1].matchAll(/\??\.([A-Za-z_$][\w$]*)/g)) {
        const start = chainStart + member.index! + member[0].length - member[1].length;
        const end = start + member[1].length;
        keys.push(member[1]);
        if (character >= start && character <= end) {
          return { kind: "path", value: [dictionary, ...keys].join("."), start, end };
        }
      }
    }
  }
  return undefined;
}

export interface ResolvedReference {
  dictionary: AnalyzedDictionary;
  /** Empty for a reference to the dictionary itself. */
  keyPath: string[];
}

export function resolveReference(
  model: ProjectModel,
  ref: Reference,
): ResolvedReference | undefined {
  if (ref.kind === "dictionary") {
    const dictionary = model.dictionaries.get(ref.value);
    return dictionary ? { dictionary, keyPath: [] } : undefined;
  }
  const [name, ...keyPath] = ref.value.split(".");
  const dictionary = model.dictionaries.get(name);
  return dictionary ? { dictionary, keyPath } : undefined;
}

/** Whether `keyPath` is a leaf, a group of leaves, or nothing in this dictionary. */
export function classifyPath(
  dictionary: AnalyzedDictionary,
  keyPath: string[],
): "leaf" | "group" | "missing" {
  const joined = keyPath.join(".");
  if (dictionary.paths.includes(joined)) return "leaf";
  return dictionary.paths.some((p) => p.startsWith(`${joined}.`)) ? "group" : "missing";
}
