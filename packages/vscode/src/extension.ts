import {
  analyzeProject,
  clearGitignore,
  createAnalysisCache,
  readStaticConfig,
  type AnalysisIssue,
} from "@dialexjs/cli/api";
import {
  buildModel,
  discoverProjects,
  modelForFile,
  type ProjectModel,
  type ProjectRoot,
} from "@dialexjs/language-server/features";
import * as vscode from "vscode";

import { SOURCE_LANGUAGES, toDiagnostic } from "./convert.js";
import { regenerate as regenerateGenerated } from "./generate.js";
import { codeActionsProvider } from "./providers/code-actions.js";
import { COMPLETION_TRIGGERS, completionProvider } from "./providers/completion.js";
import { definitionProvider } from "./providers/definition.js";
import { hoverProvider } from "./providers/hover.js";
import type { Services } from "./services.js";

interface ProjectState {
  model: ProjectModel;
  issues: AnalysisIssue[];
}

export interface DialexApi {
  /** Re-analyze all projects now and update diagnostics. */
  refresh(): Promise<void>;
}

/**
 * Everything the extension does reads dictionaries and configs from the syntax tree. It never
 * executes workspace code, which is why it declares support for untrusted workspaces.
 */
export function activate(context: vscode.ExtensionContext): DialexApi {
  const output = vscode.window.createOutputChannel("Dialex");
  const collection = vscode.languages.createDiagnosticCollection("dialex");
  const states = new Map<string, ProjectState>();
  const issueOf = new WeakMap<vscode.Diagnostic, AnalysisIssue>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generateTimer: ReturnType<typeof setTimeout> | undefined;

  // Parsed dictionaries and scanned sources are kept between refreshes and only redone for files
  // whose modification time changed, so saving one file does not re-read the whole workspace.
  const cache = createAnalysisCache();
  // Finding the projects walks the workspace, so it is redone only when files come or go.
  const projectCache = new Map<string, ProjectRoot[]>();
  const projectsIn = (folder: string): ProjectRoot[] => {
    let projects = projectCache.get(folder);
    if (!projects) {
      projects = discoverProjects(folder);
      projectCache.set(folder, projects);
    }
    return projects;
  };
  const forgetLayout = () => {
    projectCache.clear();
    clearGitignore(cache);
  };

  const settings = () => vscode.workspace.getConfiguration("dialex");
  const modelFor = (doc: vscode.TextDocument) =>
    settings().get<boolean>("enable", true)
      ? modelForFile(
          [...states.values()].map((s) => s.model),
          doc.uri.fsPath,
        )
      : undefined;

  const services: Services = {
    output,
    settings,
    projectsIn,
    modelFor,
    issueOf,
    issues: () => [...states.values()].flatMap((state) => state.issues),
  };

  function publish() {
    collection.clear();
    const byFile = new Map<string, vscode.Diagnostic[]>();

    // Off when an ESLint or oxlint plugin reports the same problems
    const show = settings().get<boolean>("diagnostics", true);
    for (const { issues } of show ? states.values() : []) {
      for (const issue of issues) {
        const diagnostic = toDiagnostic(issue);
        issueOf.set(diagnostic, issue);
        byFile.set(issue.file, [...(byFile.get(issue.file) ?? []), diagnostic]);
      }
    }

    for (const [file, diagnostics] of byFile) collection.set(vscode.Uri.file(file), diagnostics);
  }

  async function refresh(): Promise<void> {
    states.clear();
    if (!settings().get<boolean>("enable", true)) {
      publish();
      return;
    }

    const configPath = settings().get<string>("configPath") || undefined;
    const unused = settings().get<boolean>("unusedKeys", false);

    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      for (const { root, ignore } of projectsIn(folder.uri.fsPath)) {
        try {
          const { config, notes } = readStaticConfig(root, configPath);
          for (const note of notes) output.appendLine(`[${root}] ${note}`);

          const result = await analyzeProject({
            root,
            config,
            runtime: false,
            ignore,
            unused,
            cache,
          });
          states.set(root, {
            model: buildModel(root, config.defaultLocale, result),
            issues: result.issues,
          });
        } catch (error) {
          output.appendLine(`[${root}] analysis failed: ${(error as Error).message}`);
        }
      }
    }
    publish();
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 300);
  }

  function regenerate(): void {
    regenerateGenerated(services);
  }

  function scheduleGenerate() {
    if (generateTimer) clearTimeout(generateTimer);
    generateTimer = setTimeout(regenerate, 250);
  }

  const sourceSelector = SOURCE_LANGUAGES.map((language) => ({ language, scheme: "file" }));

  context.subscriptions.push(
    output,
    collection,

    vscode.languages.registerHoverProvider(sourceSelector, hoverProvider(services)),

    vscode.languages.registerDefinitionProvider(sourceSelector, definitionProvider(services)),

    vscode.languages.registerCompletionItemProvider(
      sourceSelector,
      completionProvider(services),
      ...COMPLETION_TRIGGERS,
    ),

    vscode.languages.registerCodeActionsProvider(
      // TypeScript is in the list, which also covers the `.content.ts` dictionary files
      sourceSelector,
      codeActionsProvider(services),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
    ),

    vscode.commands.registerCommand("dialex.refresh", () => refresh()),
    vscode.commands.registerCommand("dialex.generate", () => {
      regenerate();
      return refresh();
    }),

    vscode.workspace.onDidSaveTextDocument(schedule),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      forgetLayout();
      schedule();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("dialex")) schedule();
    }),
  );

  for (const pattern of ["**/*.content.ts", "**/dialex.config.*", "**/i18n.config.*"]) {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    for (const handler of [schedule, scheduleGenerate]) {
      watcher.onDidCreate(handler);
      watcher.onDidChange(handler);
      watcher.onDidDelete(handler);
    }
    // A file appearing or disappearing can change which projects exist; an edit cannot.
    watcher.onDidCreate(() => projectCache.clear());
    watcher.onDidDelete(() => projectCache.clear());
    context.subscriptions.push(watcher);
  }

  const gitignoreWatcher = vscode.workspace.createFileSystemWatcher("**/.gitignore");
  for (const subscribe of [
    gitignoreWatcher.onDidCreate,
    gitignoreWatcher.onDidChange,
    gitignoreWatcher.onDidDelete,
  ]) {
    subscribe.call(gitignoreWatcher, () => {
      forgetLayout();
      schedule();
      scheduleGenerate();
    });
  }
  context.subscriptions.push(gitignoreWatcher);

  context.subscriptions.push({
    dispose() {
      if (timer) clearTimeout(timer);
      if (generateTimer) clearTimeout(generateTimer);
    },
  });

  void refresh();
  return { refresh };
}

export function deactivate() {}
