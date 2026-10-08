import * as vscode from "vscode";
import { analyzeProject, readStaticConfig, type AnalysisIssue } from "@dialexjs/cli/api";
import { completionContextAt, completionEntries, type CompletionEntry } from "./completion.js";
import { definitionFor } from "./definition.js";
import { buildHover } from "./hover.js";
import { buildModel, modelForFile, type ProjectModel } from "./model.js";
import { discoverProjects } from "./projects.js";
import { addMissingKeys, addUnknownKey, type MissingKey } from "./quickfix.js";
import { findReferenceAt } from "./references.js";

/** Source languages where `t("...")` and `getDictionary("...")` are recognised. */
const SOURCE_LANGUAGES = [
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
  "vue",
  "svelte",
  "astro",
];

interface ProjectState {
  model: ProjectModel;
  issues: AnalysisIssue[];
}

export interface DialexApi {
  /** Re-analyze all projects now and update diagnostics. */
  refresh(): Promise<void>;
}

const COMPLETION_KINDS: Record<CompletionEntry["kind"], vscode.CompletionItemKind> = {
  dictionary: vscode.CompletionItemKind.Module,
  group: vscode.CompletionItemKind.Folder,
  leaf: vscode.CompletionItemKind.Text,
};

const fullRange = (doc: vscode.TextDocument) =>
  new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));

function severityOf(issue: AnalysisIssue): vscode.DiagnosticSeverity {
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

  const settings = () => vscode.workspace.getConfiguration("dialex");
  const modelFor = (doc: vscode.TextDocument) =>
    settings().get<boolean>("enable", true)
      ? modelForFile(
          [...states.values()].map((s) => s.model),
          doc.uri.fsPath,
        )
      : undefined;

  function publish() {
    collection.clear();
    const byFile = new Map<string, vscode.Diagnostic[]>();

    for (const { issues } of states.values()) {
      for (const issue of issues) {
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
      for (const { root, ignore } of discoverProjects(folder.uri.fsPath)) {
        try {
          const { config, notes } = readStaticConfig(root, configPath);
          for (const note of notes) output.appendLine(`[${root}] ${note}`);

          const result = await analyzeProject({ root, config, runtime: false, ignore, unused });
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

  const sourceSelector = SOURCE_LANGUAGES.map((language) => ({ language, scheme: "file" }));

  context.subscriptions.push(
    output,
    collection,

    vscode.languages.registerHoverProvider(sourceSelector, {
      provideHover(doc, position) {
        const model = modelFor(doc);
        const ref = model && findReferenceAt(doc.lineAt(position.line).text, position.character);
        const markdown = ref && model ? buildHover(model, ref) : undefined;
        if (!ref || !markdown) return undefined;

        const content = new vscode.MarkdownString(markdown);
        content.supportHtml = true; // only the <br> this extension writes; text is escaped
        return new vscode.Hover(
          content,
          new vscode.Range(position.line, ref.start, position.line, ref.end),
        );
      },
    }),

    vscode.languages.registerDefinitionProvider(sourceSelector, {
      provideDefinition(doc, position) {
        const model = modelFor(doc);
        const ref = model && findReferenceAt(doc.lineAt(position.line).text, position.character);
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
    }),

    vscode.languages.registerCompletionItemProvider(
      sourceSelector,
      {
        provideCompletionItems(doc, position) {
          const model = modelFor(doc);
          const before = doc.lineAt(position.line).text.slice(0, position.character);
          const completion = model && completionContextAt(before);
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
      },
      '"',
      "'",
      "`",
      ".",
    ),

    vscode.languages.registerCodeActionsProvider(
      // TypeScript is in the list, which also covers the `.content.ts` dictionary files
      sourceSelector,
      {
        async provideCodeActions(doc, _range, actionContext) {
          const actions: vscode.CodeAction[] = [];
          const replaceAll = (target: vscode.TextDocument, text: string) => {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(target.uri, fullRange(target), text);
            return edit;
          };

          for (const diagnostic of actionContext.diagnostics) {
            const issue = issueOf.get(diagnostic);
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
              const model = modelFor(doc);
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
          const missing: MissingKey[] = [...states.values()]
            .flatMap((s) => s.issues)
            .filter(
              (i) => i.file === doc.uri.fsPath && i.code === "missing-key" && i.locale && i.path,
            )
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
      },
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
    ),

    vscode.commands.registerCommand("dialex.refresh", () => refresh()),

    vscode.workspace.onDidSaveTextDocument(schedule),
    vscode.workspace.onDidChangeWorkspaceFolders(schedule),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("dialex")) schedule();
    }),
  );

  for (const pattern of ["**/*.content.ts", "**/dialex.config.*", "**/i18n.config.*"]) {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    watcher.onDidCreate(schedule);
    watcher.onDidChange(schedule);
    watcher.onDidDelete(schedule);
    context.subscriptions.push(watcher);
  }

  context.subscriptions.push({
    dispose() {
      if (timer) clearTimeout(timer);
    },
  });

  void refresh();
  return { refresh };
}

export function deactivate() {}
