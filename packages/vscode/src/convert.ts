import type { AnalysisIssue } from "@dialexjs/cli/api";
import type { CompletionEntry } from "@dialexjs/language-server/features";
import * as vscode from "vscode";

/** Source languages where `t("...")` and `getDictionary("...")` are recognised. */
export const SOURCE_LANGUAGES = [
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
  "vue",
  "svelte",
  "astro",
];

export const COMPLETION_KINDS: Record<CompletionEntry["kind"], vscode.CompletionItemKind> = {
  dictionary: vscode.CompletionItemKind.Module,
  group: vscode.CompletionItemKind.Folder,
  leaf: vscode.CompletionItemKind.Text,
};

export const fullRange = (doc: vscode.TextDocument) =>
  new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));

export function severityOf(issue: AnalysisIssue): vscode.DiagnosticSeverity {
  if (issue.code === "unused-key" || issue.code === "unused-dictionary") {
    return vscode.DiagnosticSeverity.Hint;
  }
  switch (issue.level) {
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}

/** The editor diagnostic for an analysis issue. */
export function toDiagnostic(issue: AnalysisIssue): vscode.Diagnostic {
  const range = issue.range
    ? new vscode.Range(
        issue.range.start.line,
        issue.range.start.column,
        issue.range.end.line,
        issue.range.end.column,
      )
    : new vscode.Range(0, 0, 0, 0);
  const diagnostic = new vscode.Diagnostic(range, issue.message, severityOf(issue));
  diagnostic.source = "dialex";
  diagnostic.code = issue.code;
  if (severityOf(issue) === vscode.DiagnosticSeverity.Hint) {
    diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
  }
  return diagnostic;
}
