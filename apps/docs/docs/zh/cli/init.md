# dialex init

在当前项目中初始化 Dialex。

- 检测框架（Next.js、Fastify、Koa、Hono、Express、NestJS、Elysia、SvelteKit、Astro、Vue、Nuxt、React/Vite）。
- 使用 Magicast 的 AST 转换编辑 `dialex.config.ts`；在 React 和 Vue 项目中把 `i18nPlugin()` 注入 `vite.config.ts`；在 Nuxt 项目中把 `dialex/nuxt` 模块注册到 `nuxt.config.ts`。
- 写入初始词典和 TypeScript 声明文件。

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| 选项                            | 说明                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`、`express`、`fastify`、`koa`、`nestjs`、`elysia`、`sveltekit`、`astro`、`vue`、`nuxt`、`next` 或 `react` |
| `-d, --default-locale <locale>` | 默认 locale，例如 `en`                                                                                          |
| `-l, --locales <locales>`       | 以逗号分隔的 locale，例如 `en,tr`                                                                               |
| `-y, --yes`                     | 跳过提示并使用默认值                                                                                            |
