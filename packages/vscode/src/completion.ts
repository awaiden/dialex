import type { AnalyzedDictionary } from "@dialexjs/cli/api";
import type { ProjectModel } from "./model.js";

export type CompletionContext =
  | { kind: "dictionary"; call: string; typed: string; length: number }
  | { kind: "path"; dictionary: string; parent: string[]; typed: string; length: number };

const CALL = /(?<![\w$.])(t|getDictionary|useDictionary|DialexDictionary)\(\s*(["'`])([^"'`\n]*)$/;

/**
 * Whether the cursor is inside the string argument of a Dialex call, and what is being typed.
 * `textBeforeCursor` is the line up to the cursor. `length` is how many characters before the
 * cursor a completion replaces.
 */
export function completionContextAt(textBeforeCursor: string): CompletionContext | undefined {
  const match = CALL.exec(textBeforeCursor);
  if (!match) return undefined;
  const [, call, , value] = match;

  if (call === "t" && value.includes(".")) {
    const segments = value.split(".");
    const typed = segments.pop()!;
    const [dictionary, ...parent] = segments;
    return { kind: "path", dictionary, parent, typed, length: typed.length };
  }
  return { kind: "dictionary", call, typed: value, length: value.length };
}

export interface CompletionEntry {
  label: string;
  kind: "dictionary" | "group" | "leaf";
  detail: string;
  /** Text to insert in place of what was typed. */
  insertText: string;
  /** Re-open the suggestion list after inserting (after `home.` or `nav.`). */
  retrigger: boolean;
  documentation?: string;
}

const preview = (text: string | undefined) =>
  text === undefined ? undefined : text.length > 60 ? `${text.slice(0, 57)}...` : text;

function dictionaryEntries(
  model: ProjectModel,
  context: Extract<CompletionContext, { kind: "dictionary" }>,
) {
  return [...model.dictionaries.values()]
    .filter((d) => d.name.startsWith(context.typed))
    .map<CompletionEntry>((d) => {
      // t("home.title") continues with a dot; getDictionary("home") is complete as is
      const continues = context.call === "t";
      return {
        label: d.name,
        kind: "dictionary",
        detail: `${d.paths.length} keys · ${d.locales.join(", ")}`,
        insertText: continues ? `${d.name}.` : d.name,
        retrigger: continues,
      };
    });
}

function pathEntries(
  model: ProjectModel,
  dictionary: AnalyzedDictionary,
  context: Extract<CompletionContext, { kind: "path" }>,
) {
  const prefix = context.parent.length > 0 ? `${context.parent.join(".")}.` : "";
  const children = new Map<string, { leaf: boolean }>();

  for (const keyPath of dictionary.paths) {
    if (!keyPath.startsWith(prefix)) continue;
    const rest = keyPath.slice(prefix.length).split(".");
    const name = rest[0];
    if (!name.startsWith(context.typed)) continue;
    const entry = children.get(name) ?? { leaf: true };
    if (rest.length > 1) entry.leaf = false;
    children.set(name, entry);
  }

  return [...children].map<CompletionEntry>(([name, { leaf }]) => {
    const full = `${prefix}${name}`;
    const holder = [model.defaultLocale, ...dictionary.locales].find((l) =>
      dictionary.leaves.get(l)?.has(full),
    );
    const text = holder ? dictionary.leaves.get(holder)!.get(full)! : undefined;
    return {
      label: name,
      kind: leaf ? "leaf" : "group",
      detail: leaf
        ? (preview(text?.kind === "string" ? text.value : text ? `(${text.kind})` : undefined) ??
          "")
        : "keys…",
      insertText: leaf ? name : `${name}.`,
      retrigger: !leaf,
    };
  });
}

/** Suggestions for the string being typed, filtered by what is already there. */
export function completionEntries(
  model: ProjectModel,
  context: CompletionContext,
): CompletionEntry[] {
  if (context.kind === "dictionary") return dictionaryEntries(model, context);
  const dictionary = model.dictionaries.get(context.dictionary);
  return dictionary ? pathEntries(model, dictionary, context) : [];
}
