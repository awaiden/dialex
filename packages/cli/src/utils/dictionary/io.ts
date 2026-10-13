import fs from "node:fs";

import { generateCode, parseModule, writeFile } from "magicast";

import type { AstNode as Node } from "../ast.js";
import { isStaticallyComplete, locateLocalesObject, locateName } from "./ast-helpers.js";
import type { DictionaryFile } from "./types.js";

/**
 * Parses dictionary source text (for example an unsaved editor buffer). Returns `undefined` when
 * the file does not have an editable shape; throws on syntax errors.
 */
export function parseDictionaryText(file: string, text: string): DictionaryFile | undefined {
  const mod = parseModule(text);
  const exported: Node = (mod.exports as any).default;
  const ast: Node = exported?.$ast;
  if (!ast) return undefined;
  const declaration = ast.declaration ?? ast;
  const localesObj = locateLocalesObject(declaration);
  return localesObj
    ? {
        file,
        mod,
        localesObj,
        name: locateName(declaration),
        endsWithNewline: text.endsWith("\n"),
        complete: isStaticallyComplete(localesObj),
      }
    : undefined;
}

/** Loads a dictionary file; returns `undefined` when its shape is not editable. */
export async function loadDictionaryFile(file: string): Promise<DictionaryFile | undefined> {
  return parseDictionaryText(file, fs.readFileSync(file, "utf-8"));
}

/** The source text with all edits applied, without writing anything. */
export function renderDictionaryFile(df: DictionaryFile): string {
  const code = generateCode(df.mod as any).code;
  return df.endsWithNewline && !code.endsWith("\n") ? `${code}\n` : code;
}

export async function saveDictionaryFile(df: DictionaryFile): Promise<void> {
  await writeFile(df.mod, df.file);
  if (df.endsWithNewline) {
    const text = fs.readFileSync(df.file, "utf-8");
    if (!text.endsWith("\n")) fs.writeFileSync(df.file, text + "\n", "utf-8");
  }
}
