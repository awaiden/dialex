# dialex generate

把 `.content.ts` 词典编译成静态模块，使服务端执行零额外开销。

输出：

- `src/dialex.generated.ts`，你作为 `dictionaries` 传入的静态词典映射。
- `src/dialex-env.d.ts`，[类型注册表扩展](../guide/type-safety.md)。

```bash
dialex generate
dialex generate --watch
dialex gen -o src/custom.generated.ts
```

| 选项                  | 说明                             |
| --------------------- | -------------------------------- |
| `-w, --watch`         | 监视词典文件，并在变化时重新生成 |
| `-o, --output <path>` | 生成的词典的自定义输出路径       |
| `-c, --config <path>` | 自定义配置路径                   |

在构建或启动任何服务端应用之前运行它，通常通过 `init` 添加的 `dx:generate` 脚本来运行。
