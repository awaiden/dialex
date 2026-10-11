import { createHTTPServer } from "@trpc/server/adapters/standalone";

import { appRouter, createContext } from "./trpc.js";

const port = Number(process.env.PORT) || 3007;

createHTTPServer({ router: appRouter, createContext }).listen(port);

console.log(`[tRPC] Server running at http://localhost:${port}`);
console.log(`  curl -H 'Accept-Language: tr' http://localhost:${port}/home`);
