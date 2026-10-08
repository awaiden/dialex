# Framework Adapters Reference

Dialex provides zero-runtime overhead integrations for common web frameworks.

## React & Vite

Install plugin in `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import { i18nPlugin } from "dialexjs/vite";

export default defineConfig({
  plugins: [i18nPlugin()],
});
```

Wrap your root component with `I18nProvider`:

```tsx
import { I18nProvider } from "dialexjs/react";
import dictionaries from "./i18n.generated.js";

export function App() {
  return (
    <I18nProvider dictionaries={dictionaries} initialLocale="en">
      <Main />
    </I18nProvider>
  );
}
```

## Next.js (App Router)

In server components:

```tsx
import { getDictionary } from "dialexjs/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale = "en" } = await params;
  const dict = getDictionary("home", locale);
  return <h1>{dict.title}</h1>;
}
```

## Express

```typescript
import express from "express";
import { i18n } from "dialexjs/express";
import dictionaries from "./i18n.generated.js";

const app = express();
app.use(i18n({ dictionaries }));

app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title });
});
```

## Hono

```typescript
import { Hono } from "hono";
import { i18n } from "dialexjs/hono";
import dictionaries from "./i18n.generated.js";

const app = new Hono();
app.use("*", i18n({ dictionaries }));

app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title });
});
```

## Fastify

```typescript
import Fastify from "fastify";
import { i18nPlugin } from "dialexjs/fastify";
import dictionaries from "./i18n.generated.js";

const app = Fastify();
await app.register(i18nPlugin, { dictionaries });

app.get("/", (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title };
});
```
