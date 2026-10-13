import { buildHover, findBindings, findReferenceAt } from "@dialexjs/language-server/features";
import * as vscode from "vscode";

import type { Services } from "../services.js";

export const hoverProvider = (services: Services): vscode.HoverProvider => ({
  provideHover(doc, position) {
    const model = services.modelFor(doc);
    const ref =
      model &&
      findReferenceAt(
        doc.lineAt(position.line).text,
        position.character,
        findBindings(doc.getText()),
      );
    const markdown = ref && model ? buildHover(model, ref) : undefined;
    if (!ref || !markdown) return undefined;

    const content = new vscode.MarkdownString(markdown);
    content.supportHtml = true; // only the <br> this extension writes; text is escaped
    return new vscode.Hover(
      content,
      new vscode.Range(position.line, ref.start, position.line, ref.end),
    );
  },
});
