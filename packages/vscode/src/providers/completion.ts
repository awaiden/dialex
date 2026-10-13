import {
  completionContextAt,
  completionEntries,
  findBindings,
} from "@dialexjs/language-server/features";
import * as vscode from "vscode";

import { COMPLETION_KINDS } from "../convert.js";
import type { Services } from "../services.js";

export const completionProvider = (services: Services): vscode.CompletionItemProvider => ({
  provideCompletionItems(doc, position) {
    const model = services.modelFor(doc);
    const before = doc.lineAt(position.line).text.slice(0, position.character);
    const completion = model && completionContextAt(before, findBindings(doc.getText()));
    if (!model || !completion) return undefined;

    return completionEntries(model, completion).map((entry) => {
      const item = new vscode.CompletionItem(entry.label, COMPLETION_KINDS[entry.kind]);
      item.detail = entry.detail;
      item.insertText = entry.insertText;
      item.range = new vscode.Range(
        position.line,
        position.character - completion.length,
        position.line,
        position.character,
      );
      if (entry.retrigger) {
        item.command = {
          command: "editor.action.triggerSuggest",
          title: "Continue completing",
        };
      }
      return item;
    });
  },
});

/** Characters that open a completion list: quotes and the dot of a path. */
export const COMPLETION_TRIGGERS = ['"', "'", "`", "."];
