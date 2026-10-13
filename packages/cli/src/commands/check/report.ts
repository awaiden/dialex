import type { AnalysisIssue } from "../../analysis/index.js";
import type { CheckDiagnostic } from "./types.js";

export function addIssue(diag: CheckDiagnostic, issue: AnalysisIssue) {
  const level = issue.level === "error" ? "error" : "warning";
  (level === "error" ? diag.errors : diag.warnings).push(issue.message);
  diag.annotations.push({
    level,
    message: issue.message,
    line: issue.range ? issue.range.start.line + 1 : undefined,
  });
}

export function escapeAnnotation(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
