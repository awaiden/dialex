import { scanReferences, type AnalyzedDictionary, type Reference } from "@dialexjs/cli/api";
import type { ProjectModel } from "./model.js";

/** `getDictionary("home").nav.about` -> the `.nav.about` member chain after the call. */
const MEMBER_CHAIN =
  /(?:getDictionary|useDictionary)\(\s*(["'`])([^"'`$\n]+)\1[^()\n]*\)((?:\??\.[A-Za-z_$][\w$]*)+)/dg;

/**
 * The Dialex reference under the cursor on one line of code: a dictionary name, a `t("a.b.c")`
 * path, or a member of `getDictionary("a")` such as `.title`. Offsets are into `lineText`.
 */
export function findReferenceAt(lineText: string, character: number): Reference | undefined {
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
