import { addMissingKeys, addUnknownKey, type MissingKey } from "@dialexjs/language-server/features";
import * as vscode from "vscode";

import { fullRange } from "../convert.js";
import type { Services } from "../services.js";

export const codeActionsProvider = (services: Services): vscode.CodeActionProvider => ({
  async provideCodeActions(doc, _range, actionContext) {
    const actions: vscode.CodeAction[] = [];
    const replaceAll = (target: vscode.TextDocument, text: string) => {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(target.uri, fullRange(target), text);
      return edit;
    };

    for (const diagnostic of actionContext.diagnostics) {
      const issue = services.issueOf.get(diagnostic);
      if (!issue?.path) continue;

      if (issue.code === "missing-key" && issue.locale) {
        const text = addMissingKeys(doc.uri.fsPath, doc.getText(), [
          { locale: issue.locale, path: issue.path, sourceLocale: issue.sourceLocale },
        ]);
        if (!text) continue;
        const action = new vscode.CodeAction(
          `Add "${issue.path.join(".")}" to ${issue.locale} (marked [TODO])`,
          vscode.CodeActionKind.QuickFix,
        );
        action.diagnostics = [diagnostic];
        action.edit = replaceAll(doc, text);
        action.isPreferred = true;
        actions.push(action);
      }

      if (issue.code === "unknown-path" && issue.dictionary) {
        const model = services.modelFor(doc);
        const dictionary = model?.dictionaries.get(issue.dictionary);
        if (!dictionary) continue;

        const dictionaryDoc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(dictionary.file),
        );
        const text = addUnknownKey(dictionary.file, dictionaryDoc.getText(), issue.path);
        if (!text) continue;
        const action = new vscode.CodeAction(
          `Add "${issue.path.join(".")}" to the "${dictionary.name}" dictionary`,
          vscode.CodeActionKind.QuickFix,
        );
        action.diagnostics = [diagnostic];
        action.edit = replaceAll(dictionaryDoc, text);
        actions.push(action);
      }
    }

    // One action for every missing key in this dictionary file
    const missing: MissingKey[] = services
      .issues()
      .filter((i) => i.file === doc.uri.fsPath && i.code === "missing-key" && i.locale && i.path)
      .map((i) => ({ locale: i.locale!, path: i.path!, sourceLocale: i.sourceLocale }));
    if (missing.length > 1) {
      const text = addMissingKeys(doc.uri.fsPath, doc.getText(), missing);
      if (text) {
        const action = new vscode.CodeAction(
          `Add all ${missing.length} missing keys (marked [TODO])`,
          vscode.CodeActionKind.QuickFix,
        );
        action.edit = replaceAll(doc, text);
        actions.push(action);
      }
    }

    return actions;
  },
});
