import { definitionFor, findBindings, findReferenceAt } from "@dialexjs/language-server/features";
import * as vscode from "vscode";

import type { Services } from "../services.js";

export const definitionProvider = (services: Services): vscode.DefinitionProvider => ({
  provideDefinition(doc, position) {
    const model = services.modelFor(doc);
    const ref =
      model &&
      findReferenceAt(
        doc.lineAt(position.line).text,
        position.character,
        findBindings(doc.getText()),
      );
    const target = ref && model ? definitionFor(model, ref) : undefined;
    if (!target) return undefined;

    return new vscode.Location(
      vscode.Uri.file(target.file),
      new vscode.Range(
        target.range.start.line,
        target.range.start.column,
        target.range.end.line,
        target.range.end.column,
      ),
    );
  },
});
