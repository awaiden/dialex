# Framework Adapters Reference

Dialex provides zero-runtime overhead integrations for common web frameworks.

## React & Vite

There is no bundler plugin. Run `dx generate` (keep `dx generate --watch` running while you develop), then spread the generated `dialex` export into the provider:

```tsx
import { DialexProvider } from "dialexjs/react";

import { dialex } from "./dialex.generated";

export function App() {
  return (
    <DialexProvider {...dialex} initialLocale="en">
      <Main />
    </DialexProvider>
  );
}
```

## Next.js (App Router)

In server components:

```tsx
// src/dialex.ts: export const { getDictionary } = createDialexServer(dialex);
import { getDictionary } from "../../dialex";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale = "en" } = await params;
  const dict = getDictionary("home", locale);
  return <h1>{dict.title}</h1>;
}
```

## Express

```typescript
import { dialexExpress } from "dialexjs/express";
import express from "express";

import { dialex } from "./dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title });
});
```

## Hono

```typescript
import { dialexHono } from "dialexjs/hono";
import { Hono } from "hono";

import { dialex } from "./dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title });
});
```

## Fastify

```typescript
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import { dialex } from "./dialex.generated.js";

const app = Fastify();
await app.register(dialexPlugin, { ...dialex });

app.get("/", (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title };
});
```

## Svelte (Vite)

```svelte
<script lang="ts">
  import { provideDialex, useDictionary } from "dialexjs/svelte";
  import { dialex } from "./dialex.generated";

  provideDialex({ ...dialex });
  const home = useDictionary("home");
</script>

<h1>{$home.title}</h1>
```

## Solid

```tsx
import { DialexProvider, useDictionary } from "dialexjs/solid";

import { dialex } from "./dialex.generated";

// <DialexProvider {...dialex}><App /></DialexProvider>
const home = useDictionary("home"); // an accessor: home().title
```

## Preact

```tsx
import { DialexProvider, useDictionary } from "dialexjs/preact";
import { render } from "preact";

import { dialex } from "./dialex.generated";

// render(<DialexProvider {...dialex}><App /></DialexProvider>, root)
const home = useDictionary("home"); // a plain object: home.title
```

## Qwik

Dictionaries contain functions, so bind the hooks in a module and import them (never create
them inside a component):

```ts
// src/i18n.ts
import { createDialexQwik } from "dialexjs/qwik";

import { dialex } from "./dialex.generated";

export const { useDialexProvider, useDialex, setLocale, useDictionary, useT } = createDialexQwik({
  ...dialex,
});
```

Call `useDialexProvider({ initialLocale })` in the root layout. Change the locale with
`setLocale(useDialex(), "tr")`. `useDictionary("home")` returns an accessor: write `home().title`
in JSX, because Qwik does not refresh plain property reads of a copied object.

## Lit and Web Components

```ts
import { createDialex, DialexController } from "dialexjs/lit";

export const i18n = createDialex({ ...dialex }); // once, in its own module

// in an element: private dx = new DialexController(this, i18n);
// in render(): this.dx.dictionary("home").title, this.dx.t("home")("home.items", { count })
```

## React Native / Expo

```tsx
import { DialexProvider, useDictionary } from "dialexjs/react-native";

// <DialexProvider {...dialex} deviceLocales={["tr-TR", "en-US"]} storage={AsyncStorage}>
```

`deviceLocales` picks the first supported device language, and `storage` (anything with
`getItem` and `setItem`) remembers the user's choice. The hooks are those of `dialexjs/react`.

## Hapi, AdonisJS and tRPC

```ts
// Hapi: request.locale, request.getDictionary("home")
await server.register({ plugin: dialexPlugin, options: { ...dialex } }); // dialexjs/hapi

// AdonisJS: export default createDialexMiddleware({ ...dialex }) // dialexjs/adonis
// then router.use([() => import("#middleware/dialex_middleware")])

// tRPC: const resolveDialex = createDialexContext({ ...dialex }) // dialexjs/trpc
// createContext: ({ req }) => ({ ...resolveDialex(req) })
```

## React Router (framework mode)

Resolve the locale in the root loader with `createDialexHandler({ ...dialex })` from
`dialexjs/web`, return it, and render `<DialexProvider {...dialex} initialLocale={locale}>`.
Set `output: "app/dialex.generated.ts"` in `dialex.config.ts` because the source folder is `app/`.
