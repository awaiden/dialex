/**
 * The editor-independent parts of Dialex's editor support: the project model, reference lookup,
 * hover, go to definition, completion, quick-fix text edits and project discovery. They know
 * nothing about LSP or VS Code, so the language server and the VS Code extension share them.
 */
export * from "./features/model.js";
export * from "./features/bindings.js";
export * from "./features/references.js";
export * from "./features/hover.js";
export * from "./features/definition.js";
export * from "./features/completion.js";
export * from "./features/quickfix.js";
export * from "./features/projects.js";
