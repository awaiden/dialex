# AI 助手与 MCP

Dialex 专为与 Claude、Cursor、ChatGPT 和 Codex 等 AI 编码助手无缝协作而设计。它提供专用的 Model Context Protocol (MCP) 服务端、可安装的 Agent 技能、所有 CLI 命令的机器可读 JSON 输出以及自动化配置。

## 使用 `dialex init` 进行配置

在新项目中初始化 Dialex 时，运行：

```bash
dialex init --ai
```

这将自动执行：

1. 在 `.mcp.json` 中安装并注册 Dialex MCP 服务端。
2. 将 Dialex 技能定义添加到 `.agents/skills/dialex/SKILL.md`。
3. 将核心国际化指导规则添加到 `AGENTS.md`。

## MCP 服务端 (`@dialexjs/mcp`)

`@dialexjs/mcp` 软件包通过 stdio 运行，提供检查词典、校验一致性以及执行安全语法树编辑的工具。它绝不会执行项目代码，也绝不会调用付费翻译 API。

### 配置

在 `.mcp.json` 中添加 Dialex：

```json
{
  "mcpServers": {
    "dialex": {
      "command": "npx",
      "args": ["@dialexjs/mcp"]
    }
  }
}
```

### 可用工具

| 工具                       | 类型 | 说明                                                           |
| -------------------------- | ---- | -------------------------------------------------------------- |
| `dialex_config`            | 读取 | 在不运行代码的情况下读取静态配置（`locales`、`defaultLocale`） |
| `dialex_list_dictionaries` | 读取 | 列出发现的所有词典文件及其 locale                              |
| `dialex_get_dictionary`    | 读取 | 获取各 locale 的翻译叶子键与值                                 |
| `dialex_check`             | 读取 | 执行一致性与引用分析，返回问题和注解                           |
| `dialex_find_usages`       | 读取 | 扫描文件中的词典调用（`getDictionary`、`t(...)`）              |
| `dialex_missing`           | 读取 | 列出缺失或仍包含 `[TODO]` 占位符的键                           |
| `dialex_set_key`           | 编辑 | 通过 AST 安全设置字符串；除非 `overwrite: true`，否则阻止覆盖  |
| `dialex_add_missing`       | 编辑 | 在所有 locale 中将缺失键插入为 `[TODO]` 占位项                 |
| `dialex_generate`          | 工具 | 重新生成 `dialex.generated.ts` 和 `dialex-env.d.ts`            |

### 文档资源

服务端在 `dialex://docs/<topic>` 下提供内置 markdown 资源：

- `dialex://docs/guide`
- `dialex://docs/translate`
- `dialex://docs/icu`
- `dialex://docs/adapters`

## Agent 技能

Dialex 发布了与 `skills` CLI 兼容的技能：

```bash
npx skills add awaiden/dialex
```

包含两项技能：

- `dialex`：核心概念、词典结构和框架适配器模式。
- `dialex-translate`：用于检测缺失翻译、插入占位项以及验证 ICU 一致性的工作流。

## 机器可读的 JSON 输出

所有 Dialex CLI 命令均支持 `--json`，便于集成到自动化流水线和 AI Agent 中：

```bash
dialex check --json
dialex generate --json
dialex export --json
dialex import translations.json --json
dialex translate --dry-run --json
```

输出将作为结构化 JSON 发送到 stdout，同时日志和警告将被抑制。发生错误时，进程将以非零状态码退出。
