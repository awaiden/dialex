import Hapi from "@hapi/hapi";
import { dialexPlugin } from "dialexjs/hapi";

import { dialex } from "./dialex.generated.js";

const server = Hapi.server({ port: Number(process.env.PORT) || 3006 });

// Register i18n from the generated registry (dictionaries and locale config)
await server.register({ plugin: dialexPlugin, options: { ...dialex } });

// Root route demonstrating request.getDictionary and request.locale
server.route({
  method: "GET",
  path: "/",
  handler: (request) => {
    const dict = request.getDictionary("home");
    return {
      locale: request.locale,
      title: dict.title,
      description: dict.description,
    };
  },
});

// Path-based localized greeting route: /en/greet/Alice, /tr/greet/Ahmet
server.route({
  method: "GET",
  path: "/{locale}/greet/{name?}",
  handler: (request) => {
    const dict = request.getDictionary("home");
    const { name = "Guest" } = request.params as { name?: string };
    return { locale: request.locale, message: dict.greeting(name) };
  },
});

await server.start();
console.log(`[Hapi] Server running at ${server.info.uri}`);

export default server;
