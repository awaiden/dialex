# dialex generate

把 `.content.ts` 词典编译成静态模块，使服务端执行零额外开销。

输出：

- `src/dialex.generated.ts`，它导出 `dictionaries`（默认导出，供服务端适配器使用）、`config`（配置中可安全用于客户端的副本）和 `dialex`（`{ dictionaries, config }`，展开传给 `<DialexProvider {...dialex}>` 或 `createDialex({ ...dialex })`）。设置 `lazy: true` 时，它改为包含动态导入和一个 `loaders` 导出。
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

没有任何东西会替你构建这个文件，所以请保持它最新：在第二个终端运行 `dialex generate --watch`（它会响应词典文件的新增、编辑和删除以及配置变更），使用 Dialex 的 VS Code 扩展（保存时重新生成），或在 `dev` 和 `build` 之前运行 `dx generate`。[`dialex check`](./check.md) 会把过期文件报告为错误，`dialex check --fix` 会重写它。没有 `dialex.config.*` 时使用默认值，`locales` 取自你的词典。 `check` 在比较生成文件时会忽略格式（空白、引号、尾随逗号），因此 Prettier、Biome 或 oxfmt 等格式化工具可以改写它们。把它们加入格式化工具的忽略列表可以避免嘈杂的 diff。
