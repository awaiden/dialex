import type { SourceRange } from "../utils/dictionary/index.js";
import type { Reference, SourceScan } from "./types.js";

export const DEFAULT_SOURCE_GLOB = "**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}";

/** `getDictionary("x")`, `useDictionary("x")`, `@DialexDictionary("x")` */
const DICTIONARY_CALL =
  /\b(?:getDictionary|useDictionary|DialexDictionary)\(\s*(["'`])([^"'`$\n]+)\1/dg;
/** `t("dictionary.path.to.key")` */
const T_CALL = /(?<![\w$.])t\(\s*(["'`])([\w-]+(?:\.[\w-]+)+)\1/dg;

/**
 * Offsets of `//`, `/* *\/` and `<!-- -->` comments. Quoted strings are skipped so `"http://x"`
 * is not a comment; `'` and `"` end at a newline, template literals do not.
 */
function commentRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  const length = text.length;
  let i = 0;
  while (i < length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      i++;
      while (i < length && text[i] !== c && (c === "`" || text[i] !== "\n")) {
        if (text[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    let close: string | undefined;
    if (c === "/" && text[i + 1] === "/") close = "\n";
    else if (c === "/" && text[i + 1] === "*") close = "*/";
    else if (c === "<" && text.startsWith("<!--", i)) close = "-->";
    if (close === undefined) {
      i++;
      continue;
    }
    const found = text.indexOf(close, i + 2);
    const end = found === -1 ? length : close === "\n" ? found : found + close.length;
    ranges.push([i, end]);
    i = end;
  }
  return ranges;
}

const IGNORE_DIRECTIVE = /dialex-ignore(-next-line)?(?![\w-])/;
/** `dictionaries: { name: ..., "other-name": ..., shorthand }`, up to the first key. */
const DICTIONARIES_OBJECT = /\bdictionaries\s*:\s*\{/g;
const OBJECT_KEY = /\s*(?:([A-Za-z_$][\w$-]*)|(["'])([^"'\n]+)\2)\s*(?=[:,}])/y;

/** Replaces comments with spaces of the same length, keeping offsets and line breaks. */
function maskComments(text: string, comments: [number, number][]): string {
  if (comments.length === 0) return text;
  let out = "";
  let at = 0;
  for (const [from, to] of comments) {
    out += text.slice(at, from) + text.slice(from, to).replace(/[^\n]/g, " ");
    at = to;
  }
  return out + text.slice(at);
}

/** Names that an object literal `dictionaries: { ... }` registers inline. */
function inlineDictionaryNames(masked: string): string[] {
  const names = new Set<string>();
  for (const match of masked.matchAll(DICTIONARIES_OBJECT)) {
    let i = match.index! + match[0].length;
    let depth = 1;
    let expectKey = true;
    while (i < masked.length && depth > 0) {
      if (expectKey && depth === 1) {
        OBJECT_KEY.lastIndex = i;
        const key = OBJECT_KEY.exec(masked);
        if (key) {
          names.add(key[1] ?? key[3]);
          i = OBJECT_KEY.lastIndex;
        }
        expectKey = false;
        continue;
      }
      const c = masked[i];
      if (c === '"' || c === "'" || c === "`") {
        i++;
        while (i < masked.length && masked[i] !== c && (c === "`" || masked[i] !== "\n")) {
          if (masked[i] === "\\") i++;
          i++;
        }
      } else if (c === "{" || c === "[" || c === "(") depth++;
      else if (c === "}" || c === "]" || c === ")") depth--;
      else if (c === "," && depth === 1) expectKey = true;
      i++;
    }
  }
  return [...names];
}

/** Lines that a `dialex-ignore` / `dialex-ignore-next-line` comment excludes from checking. */
function ignoredLines(text: string, comments: [number, number][]): Set<number> {
  const lines = new Set<number>();
  if (!text.includes("dialex-ignore")) return lines;
  const starts = lineStarts(text);
  for (const [from, to] of comments) {
    const directive = IGNORE_DIRECTIVE.exec(text.slice(from, to));
    if (!directive) continue;
    const first = positionAt(starts, from).line;
    const last = positionAt(starts, Math.max(from, to - 1)).line;
    if (directive[1]) lines.add(last + 1);
    else for (let line = first; line <= last; line++) lines.add(line);
  }
  return lines;
}

/** References and inline dictionary names found in one source file. */
export function scanText(text: string): { references: Reference[]; inline: string[] } {
  const comments = commentRanges(text);
  const ignored = ignoredLines(text, comments);
  const starts = ignored.size > 0 ? lineStarts(text) : [];
  const inComment = (offset: number) =>
    comments.some(([from, to]) => offset >= from && offset < to);
  const references: Reference[] = [];
  const collect = (pattern: RegExp, kind: Reference["kind"]) => {
    for (const match of text.matchAll(pattern)) {
      const [start, end] = match.indices![2] as [number, number];
      if (comments.length > 0 && inComment(start)) continue;
      if (ignored.size > 0 && ignored.has(positionAt(starts, start).line)) continue;
      references.push({ kind, value: match[2], start, end });
    }
  };
  collect(DICTIONARY_CALL, "dictionary");
  collect(T_CALL, "path");
  references.sort((a, b) => a.start - b.start);
  return {
    references,
    inline: text.includes("dictionaries")
      ? inlineDictionaryNames(maskComments(text, comments))
      : [],
  };
}

/**
 * Finds `getDictionary("x")`-style and `t("x.y.z")` references in source text. References inside
 * comments, and on lines a `dialex-ignore` comment covers, are skipped.
 */
export function scanReferences(text: string): Reference[] {
  return scanText(text).references;
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

function positionAt(starts: number[], offset: number) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return { line: low, column: offset - starts[low] };
}

export function scanSource(text: string): SourceScan {
  const starts = lineStarts(text);
  const rangeOf = (start: number, end: number): SourceRange => ({
    start: positionAt(starts, start),
    end: positionAt(starts, end),
  });
  const { references, inline } = scanText(text);
  return {
    tokens: [...new Set(text.match(/[\w$-]+/g) ?? [])],
    refs: references.map((ref) => ({ ref, range: rangeOf(ref.start, ref.end) })),
    inline,
  };
}
