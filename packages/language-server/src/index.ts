#!/usr/bin/env node
import { createConnection, ProposedFeatures } from "vscode-languageserver/node.js";

import { createServer } from "./server.js";

// `--stdio` (what editors pass), `--node-ipc` and `--socket=<port>` are handled by the library.
const connection = createConnection(ProposedFeatures.all);
createServer(connection);
connection.listen();
