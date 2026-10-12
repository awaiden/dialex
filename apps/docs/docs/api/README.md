# API Reference

Everything Dialex exports, by entry point. Every entry point is a subpath of the `dialexjs` package (`import { DialexProvider } from "dialexjs/react"`); the programmatic API of the CLI is `@dialexjs/cli/api`. Nothing is exported from the package root other than what [Core](./core.md) lists, so a framework adapter is only loaded when you import it.

## Entry points

| Entry point                                                                              | What it provides                                                     | Reference                                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `dialexjs`                                                                               | Config, dictionaries, `createT`, formatting helpers, ICU and types   | [Core](./core.md), [Formatting](./formatting.md), [Types](./types.md) |
| `dialexjs/icu`                                                                           | The ICU message parser and formatter without the rest of the runtime | [ICU messages](./icu.md)                                              |
| `dialexjs/server`                                                                        | `getDictionary` and `getT` for server code                           | [Server adapters](./server-adapters.md#dialexjs-server)               |
| `dialexjs/express`, `fastify`, `koa`, `hono`, `elysia`, `h3`, `hapi`, `adonis`, `nestjs` | Request middleware, plugins and modules                              | [Server adapters](./server-adapters.md)                               |
| `dialexjs/sveltekit`, `astro`, `trpc`, `web`                                             | Hook, middleware, context and Fetch API handler                      | [Server adapters](./server-adapters.md)                               |
| `dialexjs/react`, `preact`, `solid`, `vue`, `nuxt`, `svelte`, `qwik`, `lit`, `angular`   | Providers, hooks and stores of the client frameworks                 | [Client frameworks](./client-frameworks.md)                           |
| `dialexjs/react-native`                                                                  | `DialexProvider` with device locales and storage                     | [Client frameworks](./client-frameworks.md#dialexjs-react-native)     |
| `dialexjs/next/middleware`, `dialexjs/next/link`                                         | Next.js middleware and `DialexLink`                                  | [Client frameworks](./client-frameworks.md#next-js)                   |
| `dialexjs/routing`                                                                       | Locale-prefixed paths, `hreflang` links and sitemap entries          | [Routing](./routing.md)                                               |
| `dialexjs/testing`, `dialexjs/testing/react`, `dialexjs/testing/vue`                     | Test contexts, mock requests and test providers                      | [Testing](./testing.md)                                               |
| `@dialexjs/cli/api`                                                                      | Project analysis and the dictionary editing helpers                  | [CLI API](./cli-api.md)                                               |

## Conventions

- **Typed names and paths.** `DictionaryRegistry`, `Register` and `MessageArguments` are empty interfaces that `dialex generate` augments in `dialex-env.d.ts`. Until it has run, dictionary names and `t()` paths are plain `string`; afterwards they autocomplete and are checked. See [Types](./types.md).
- **The generated `dialex` object.** Providers, adapters and `createDialexServer` accept `{ ...dialex }` from `dialex.generated.ts`. It carries the dictionaries, the client-safe config and, with lazy loading, the loaders, so locale settings are written once, in `dialex.config.ts`.
- **Failures.** A missing dictionary, locale or path never throws in production code: it logs `console.warn` with a `[dialex]` prefix and returns an empty object or the path itself. Invalid ICU messages are reported and returned unchanged by `t()`; `formatMessage` throws. Hooks that need a provider throw when it is missing.
- **Stability.** Dialex is below 1.0. Breaking changes ship in minor releases and are listed in the [changelog](../guide/changelog.md).
