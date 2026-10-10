# dialex init

在当前项目中初始化 Dialex。

- 检测框架（Next.js、Fastify、Koa、Hono、Express、NestJS、Elysia、SvelteKit、Astro、Vue、Nuxt、React/Vite）。
- 使用 Magicast AST 转换编辑 `dialex.config.ts`（任何框架都会创建配置文件），并在 Nuxt 项目中把 `dialexjs/nuxt` 模块注册到 `nuxt.config.ts`。
- 写入初始词典和 TypeScript 声明文件。
- 把 `dialexjs` 和开发依赖 `@dialexjs/cli` 添加到 `package.json`（已列出的包保持不变），并添加 `dx:generate` 脚本。之后请运行你的包管理器的 install 命令。

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| 选项                            | 说明                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`、`express`、`fastify`、`koa`、`nestjs`、`elysia`、`sveltekit`、`astro`、`vue`、`nuxt`、`next`、`svelte`、`solid`、`react-router` 或 `react` |
| `-d, --default-locale <locale>` | 默认 locale，例如 `en`                                                                                                                             |
| `-l, --locales <locales>`       | 以逗号分隔的 locale，例如 `en,tr`                                                                                                                  |
| `-y, --yes`                     | 跳过提示并使用默认值                                                                                                                               |
