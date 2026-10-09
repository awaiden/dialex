# dialex generate

Compiles `.content.ts` dictionaries into static modules for zero-overhead server execution.

Outputs:

- `src/dialex.generated.ts`, which exports `dictionaries` (the default export, for the server adapters), `config` (a client-safe copy of your config) and `dialex` (`{ dictionaries, config }`, spread into `<DialexProvider {...dialex}>` or `createDialex({ ...dialex })`). With `lazy: true` it holds dynamic imports and a `loaders` export instead.
- `src/dialex-env.d.ts`, the [type registry augmentation](../guide/type-safety.md).

```bash
dialex generate
dialex generate --watch
dialex gen -o src/custom.generated.ts
```

| Option                | Description                                       |
| --------------------- | ------------------------------------------------- |
| `-w, --watch`         | Watch dictionary files and regenerate on change   |
| `-o, --output <path>` | Custom output path for the generated dictionaries |
| `-c, --config <path>` | Custom config path                                |

Run it before building or starting any server-side app, typically via the `dx:generate` script that `init` adds.

Nothing builds this file for you, so keep it current: run `dialex generate --watch` in a second terminal (it reacts to added, edited and removed dictionary files and to config changes), use the Dialex VS Code extension (it regenerates on save), or run `dx generate` before `dev` and `build`. [`dialex check`](./check.md) reports a stale file as an error, and `dialex check --fix` rewrites it. Without a `dialex.config.*` the defaults apply and `locales` come from your dictionaries.
