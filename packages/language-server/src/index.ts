#!/usr/bin/env node

// stdout carries the protocol; anything that logs there would corrupt it. This runs before the
// server modules are loaded, hence the dynamic imports.
console.log = (...args: unknown[]) => console.error(...args);

const { createConnection, ProposedFeatures } = await import("vscode-languageserver/node.js");
const { createServer } = await import("./server.js");

// `--stdio` (what editors pass), `--node-ipc` and `--socket=<port>` are handled by the library.
const connection = createConnection(ProposedFeatures.all);
createServer(connection);
connection.listen();

// Makes this file a module, which top-level await needs.
export {};
