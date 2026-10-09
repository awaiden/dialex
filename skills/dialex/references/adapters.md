# Framework Adapters Reference

Dialex provides zero-runtime overhead integrations for common web frameworks.

## React & Vite

Install plugin in `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import { dialexPlugin } from "dialexjs/vite";

export default defineConfig({
  plugins: [dialexPlugin()],
});
```

Wrap your root component with `DialexProvider`:

```tsx
import { DialexProvider } from "dialexjs/react";
import dictionaries from "./dialex.generated.js";

export function App() {
  return (
    <DialexProvider dictionaries={dictionaries} initialLocale="en">
      <Main />
    </DialexProvider>
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
import { dialex } from "dialexjs/express";
import dictionaries from "./dialex.generated.js";

const app = express();
app.use(dialex({ dictionaries }));

app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title });
});
```

## Hono

```typescript
import { Hono } from "hono";
import { dialex } from "dialexjs/hono";
import dictionaries from "./dialex.generated.js";

const app = new Hono();
app.use("*", dialex({ dictionaries }));

app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title });
});
```

## Fastify

```typescript
import Fastify from "fastify";
import { dialexPlugin } from "dialexjs/fastify";
import dictionaries from "./dialex.generated.js";

const app = Fastify();
await app.register(dialexPlugin, { dictionaries });

app.get("/", (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title };
});
```
