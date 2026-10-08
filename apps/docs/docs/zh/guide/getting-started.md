# 快速开始

Dialex 是一个围绕用 TypeScript 定义的词典构建的 i18n 框架。编译步骤会把词典转换成静态注册表和类型声明，因此运行时查找只是普通的对象访问。

## 软件包

| 软件包          | 用途                                                           |
| --------------- | -------------------------------------------------------------- |
| `dialexjs`      | 核心运行时、框架适配器、Vite 插件                              |
| `@dialexjs/cli` | `dialexjs` / `dx` 命令，用于生成项目骨架、生成代码和检查一致性 |

## 安装

```bash
# bun
bun add dialexjs
bun add -d @dialexjs/cli

# npm
npm install dialexjs
npm install -D @dialexjs/cli

# pnpm
pnpm add dialexjs
pnpm add -D @dialexjs/cli
```

## 生成项目骨架

```bash
dialex init
```

或者以非交互方式运行：

```bash
dialex init --framework fastify --default-locale en --locales en,tr -y
```

这会创建 `dialex.config.ts` 和初始词典 `src/home.content.ts`，并在 `package.json` 中添加 `i18n:generate` 脚本（`dialex generate`）。参见 [`dialex init`](../cli/init.md)。

## 定义词典

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Dialex!",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex'e Hoş Geldiniz!",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
```

## 编译

```bash
dialex generate
```

生成 `src/i18n.generated.ts`（词典注册表）和 `src/dialex-env.d.ts`（类型扩展）。然后选择你的[框架](../frameworks/README.md)。
