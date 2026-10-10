#!/usr/bin/env node
import { createConnection, ProposedFeatures } from "vscode-languageserver/node.js";

import { createServer } from "./server.js";

// stdout carries the protocol; anything that logs there would corrupt it.
console.log = (...args: unknown[]) => console.error(...args);

// `--stdio` (what editors pass), `--node-ipc` and `--socket=<port>` are handled by the library.
const connection = createConnection(ProposedFeatures.all);
createServer(connection);
connection.listen();
