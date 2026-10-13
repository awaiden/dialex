import { fileURLToPath } from "node:url";

import type { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionItemKind, type TextEdit } from "vscode-languageserver/node.js";

import type { CompletionEntry } from "../features.js";

export const COMPLETION_KINDS: Record<CompletionEntry["kind"], CompletionItemKind> = {
  dictionary: CompletionItemKind.Module,
  group: CompletionItemKind.Folder,
  leaf: CompletionItemKind.Text,
};

/** An edit that replaces a whole document, which is how dictionary files are rewritten. */
export function replaceAll(text: string, newText: string): TextEdit {
  const lines = text.split("\n");
  return {
    range: {
      start: { line: 0, character: 0 },
      end: { line: lines.length - 1, character: lines[lines.length - 1].length },
    },
    newText,
  };
}

export const uriToPath = (uri: string) =>
  uri.startsWith("file:") ? fileURLToPath(uri) : undefined;

/** One line of an open document, without its line break. */
export const lineOf = (document: TextDocument, line: number): string =>
  document
    .getText({ start: { line, character: 0 }, end: { line: line + 1, character: 0 } })
    .replace(/\r?\n$/, "");
