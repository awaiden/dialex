# dialex generate

Compiles `.content.ts` dictionaries into static modules for zero-overhead server execution.

Outputs:

- `src/dialex.generated.ts`, the static dictionary map you pass as `dictionaries`.
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
