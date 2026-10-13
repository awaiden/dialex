import type { AnalysisIssue } from "@dialexjs/cli/api";
import type { ProjectModel, ProjectRoot } from "@dialexjs/language-server/features";
import type * as vscode from "vscode";

/** What the providers and the generator read from the extension. */
export interface Services {
  output: vscode.OutputChannel;
  settings(): vscode.WorkspaceConfiguration;
  projectsIn(folder: string): ProjectRoot[];
  /** The project model for a document, unless the features are turned off. */
  modelFor(doc: vscode.TextDocument): ProjectModel | undefined;
  /** The issue behind a diagnostic that was published. */
  issueOf: WeakMap<vscode.Diagnostic, AnalysisIssue>;
  /** The issues of every project, in project order. */
  issues(): AnalysisIssue[];
}
