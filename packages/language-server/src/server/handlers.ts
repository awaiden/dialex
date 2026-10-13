import fs from "node:fs";
import { pathToFileURL } from "node:url";

import type { AnalysisIssue } from "@dialexjs/cli/api";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  CodeActionKind,
  type CodeAction,
  type CodeActionParams,
  type CompletionParams,
  type DefinitionParams,
  type HoverParams,
  type CompletionItem,
  type Hover,
  type Location,
  type TextDocuments,
} from "vscode-languageserver/node.js";

import {
  addMissingKeys,
  addUnknownKey,
  buildHover,
  completionContextAt,
  completionEntries,
  definitionFor,
  findBindings,
  findReferenceAt,
  type MissingKey,
  type ProjectModel,
} from "../features.js";
import { COMPLETION_KINDS, lineOf, replaceAll, uriToPath } from "./convert.js";
import type { IssueData } from "./diagnostics.js";

/** What the request handlers read from the server. */
export interface HandlerContext {
  documents: TextDocuments<TextDocument>;
  /** The project model for a file, unless the features are turned off. */
  modelFor(file: string): ProjectModel | undefined;
  /** The issues of every project, in project order. */
  issues(): AnalysisIssue[];
  enabled(): boolean;
}

export const hoverHandler =
  (ctx: HandlerContext) =>
  (params: HoverParams): Hover | null => {
    const document = ctx.documents.get(params.textDocument.uri);
    const file = uriToPath(params.textDocument.uri);
    const model = document && file ? ctx.modelFor(file) : undefined;
    if (!document || !model) return null;

    const ref = findReferenceAt(
      lineOf(document, params.position.line),
      params.position.character,
      findBindings(document.getText()),
    );
    const markdown = ref ? buildHover(model, ref) : undefined;
    if (!ref || !markdown) return null;

    return {
      contents: { kind: "markdown", value: markdown },
      range: {
        start: { line: params.position.line, character: ref.start },
        end: { line: params.position.line, character: ref.end },
      },
    };
  };

export const definitionHandler =
  (ctx: HandlerContext) =>
  (params: DefinitionParams): Location | null => {
    const document = ctx.documents.get(params.textDocument.uri);
    const file = uriToPath(params.textDocument.uri);
    const model = document && file ? ctx.modelFor(file) : undefined;
    if (!document || !model) return null;

    const ref = findReferenceAt(
      lineOf(document, params.position.line),
      params.position.character,
      findBindings(document.getText()),
    );
    const target = ref ? definitionFor(model, ref) : undefined;
    if (!target) return null;

    return {
      uri: pathToFileURL(target.file).href,
      range: {
        start: { line: target.range.start.line, character: target.range.start.column },
        end: { line: target.range.end.line, character: target.range.end.column },
      },
    };
  };

export const completionHandler =
  (ctx: HandlerContext) =>
  (params: CompletionParams): CompletionItem[] => {
    const document = ctx.documents.get(params.textDocument.uri);
    const file = uriToPath(params.textDocument.uri);
    const model = document && file ? ctx.modelFor(file) : undefined;
    if (!document || !model) return [];

    const before = lineOf(document, params.position.line).slice(0, params.position.character);
    const context = completionContextAt(before, findBindings(document.getText()));
    if (!context) return [];

    const range = {
      start: { line: params.position.line, character: params.position.character - context.length },
      end: params.position,
    };
    return completionEntries(model, context).map((entry) => ({
      label: entry.label,
      kind: COMPLETION_KINDS[entry.kind],
      detail: entry.detail,
      documentation: entry.documentation,
      filterText: entry.label,
      textEdit: { range, newText: entry.insertText },
    }));
  };

export const codeActionHandler =
  (ctx: HandlerContext) =>
  (params: CodeActionParams): CodeAction[] => {
    const file = uriToPath(params.textDocument.uri);
    const document = ctx.documents.get(params.textDocument.uri);
    if (!file || !document || !ctx.enabled()) return [];

    const actions: CodeAction[] = [];
    const text = document.getText();
    const model = ctx.modelFor(file);

    for (const diagnostic of params.context.diagnostics) {
      const data = diagnostic.data as IssueData | undefined;
      if (diagnostic.source !== "dialex" || !data?.path) continue;

      if (data.code === "missing-key" && data.locale) {
        const updated = addMissingKeys(file, text, [
          { locale: data.locale, path: data.path, sourceLocale: data.sourceLocale },
        ]);
        if (!updated) continue;
        actions.push({
          title: `Add "${data.path.join(".")}" to ${data.locale} (marked [TODO])`,
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          isPreferred: true,
          edit: { changes: { [params.textDocument.uri]: [replaceAll(text, updated)] } },
        });
      }

      if (data.code === "unknown-path" && data.dictionary) {
        const dictionary = model?.dictionaries.get(data.dictionary);
        if (!dictionary) continue;

        const dictionaryUri = pathToFileURL(dictionary.file).href;
        const open = ctx.documents.get(dictionaryUri);
        let dictionaryText: string;
        try {
          dictionaryText = open ? open.getText() : fs.readFileSync(dictionary.file, "utf-8");
        } catch {
          continue;
        }
        const updated = addUnknownKey(dictionary.file, dictionaryText, data.path);
        if (!updated) continue;
        actions.push({
          title: `Add "${data.path.join(".")}" to the "${dictionary.name}" dictionary`,
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: { changes: { [dictionaryUri]: [replaceAll(dictionaryText, updated)] } },
        });
      }
    }

    // One action for every missing key in this dictionary file
    const missing: MissingKey[] = ctx
      .issues()
      .filter((issue) => issue.file === file && issue.code === "missing-key")
      .filter((issue) => issue.locale && issue.path)
      .map((issue) => ({
        locale: issue.locale!,
        path: issue.path!,
        sourceLocale: issue.sourceLocale,
      }));
    if (missing.length > 1) {
      const updated = addMissingKeys(file, text, missing);
      if (updated) {
        actions.push({
          title: `Add all ${missing.length} missing keys (marked [TODO])`,
          kind: CodeActionKind.QuickFix,
          edit: { changes: { [params.textDocument.uri]: [replaceAll(text, updated)] } },
        });
      }
    }

    return actions;
  };
