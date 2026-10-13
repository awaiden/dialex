import { pathToFileURL } from "node:url";

import type { AnalysisIssue } from "@dialexjs/cli/api";
import {
  DiagnosticSeverity,
  DiagnosticTag,
  type Connection,
  type Diagnostic,
} from "vscode-languageserver/node.js";

export function severityOf(issue: AnalysisIssue): DiagnosticSeverity {
  if (issue.code === "unused-key" || issue.code === "unused-dictionary") {
    return DiagnosticSeverity.Hint;
  }
  switch (issue.level) {
    case "error":
      return DiagnosticSeverity.Error;
    case "warning":
      return DiagnosticSeverity.Warning;
    default:
      return DiagnosticSeverity.Information;
  }
}

/** What a quick fix needs from the issue that produced a diagnostic. */
export interface IssueData {
  code: string;
  path?: string[];
  locale?: string;
  sourceLocale?: string;
  dictionary?: string;
}

export function toDiagnostic(issue: AnalysisIssue): Diagnostic {
  const severity = severityOf(issue);
  return {
    range: issue.range
      ? {
          start: { line: issue.range.start.line, character: issue.range.start.column },
          end: { line: issue.range.end.line, character: issue.range.end.column },
        }
      : { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    message: issue.message,
    severity,
    source: "dialex",
    code: issue.code,
    tags: severity === DiagnosticSeverity.Hint ? [DiagnosticTag.Unnecessary] : undefined,
    data: {
      code: issue.code,
      path: issue.path,
      locale: issue.locale,
      sourceLocale: issue.sourceLocale,
      dictionary: issue.dictionary,
    } satisfies IssueData,
  };
}

/**
 * Publishes the issues of every project, one list per file, and an explicit empty list for
 * files that had problems before and have none now.
 */
export function createPublisher(connection: Connection): (issues: AnalysisIssue[]) => void {
  let published = new Set<string>();

  return (issues) => {
    const byFile = new Map<string, Diagnostic[]>();
    for (const issue of issues) {
      const list = byFile.get(issue.file) ?? [];
      list.push(toDiagnostic(issue));
      byFile.set(issue.file, list);
    }

    const next = new Set<string>();
    for (const [file, diagnostics] of byFile) {
      const uri = pathToFileURL(file).href;
      next.add(uri);
      void connection.sendDiagnostics({ uri, diagnostics });
    }
    // Files that had problems before and have none now need an explicit empty list.
    for (const uri of published) {
      if (!next.has(uri)) void connection.sendDiagnostics({ uri, diagnostics: [] });
    }
    published = next;
  };
}
