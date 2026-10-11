---
"dialexjs": minor
"@dialexjs/cli": minor
---

Seven new framework entry points and CLI support for them.

- `dialexjs/preact`: Preact 10 and later. `<DialexProvider {...dialex}>`, `useDialex`, `useDictionary`, `useT`, `useDialexConfig`. No `preact/compat` needed.
- `dialexjs/qwik`: `createDialexQwik({ ...dialex })` returns `useDialexProvider`, `useDialex`, `setLocale`, `useDictionary` (an accessor, `home().title`), `useT` and `getPersistedLocale`. Dictionaries stay in their module; only the locale is serialized into the page.
- `dialexjs/lit`: `createDialex({ ...dialex })` holds the locale, and `DialexController` is a reactive controller that re-renders a Lit element on locale changes. It also works with plain custom elements through `subscribe`.
- `dialexjs/react-native`: `DialexProvider` for React Native and Expo with `deviceLocales` (the device's languages) and `storage` (AsyncStorage, MMKV, anything with `getItem` and `setItem`). It uses the hooks of `dialexjs/react`.
- `dialexjs/hapi`: the `dialexPlugin` for Hapi 21, adding `request.locale` and `request.getDictionary(name)`.
- `dialexjs/adonis`: `createDialexMiddleware({ ...dialex })` for AdonisJS 6 and later, adding `ctx.locale` and `ctx.getDictionary(name)`.
- `dialexjs/trpc`: `createDialexContext({ ...dialex })` puts the locale and dictionaries into the tRPC context from a Fetch `Request` or Node-style headers.
- `DialexProvider` of `dialexjs/react` accepts `onLocaleChange(locale)`.
- The `react` peer dependency is `>=19.0.0` (was `^19.3.0`), so Expo SDK apps pinned to React 19.2 install without a warning.
- `dialex init` and the type registry detect Preact, Qwik, Lit, React Native / Expo, Hapi, AdonisJS and tRPC. React Native shares the `dialexjs/react` declarations.
- `dx generate` follows a `tsconfig.json` that extends a package (such as `@adonisjs/tsconfig`) when it decides whether generated imports need the `.js` extension.
- New examples: `examples/preact`, `qwik`, `lit`, `expo`, `hapi`, `adonis` and `trpc`.

Documentation: a page for each new framework in five languages.
