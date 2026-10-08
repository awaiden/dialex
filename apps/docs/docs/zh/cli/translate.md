# dialex translate

使用你配置的机器翻译提供者补全缺失的翻译。除非设置了提供者，否则不会向任何地方发送任何内容。

```bash
dialex translate --dry-run
dialex translate
dialex translate -l tr de
dialex translate -s en
```

| 选项                        | 说明                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| `-l, --locale <locales...>` | 目标 locale（默认：除源 locale 之外所有已配置的 locale）            |
| `-s, --source <locale>`     | 源 locale（默认：`translate.sourceLocale`，然后是 `defaultLocale`） |
| `--dry-run`                 | 列出将要翻译的内容。不会调用提供者，也不会写入文件                  |
| `-c, --config <path>`       | 自定义配置路径                                                      |

## 配置提供者

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";
import { claudeProvider } from "@dialexjs/cli/translate";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr", "de"],
  translate: {
    provider: claudeProvider({ context: "Banking app. Use a formal register." }),
  },
});
```

### 内置提供者

| 提供者                     | 凭据                                                            | 选项                                                                 |
| -------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `claudeProvider(options?)` | `ANTHROPIC_API_KEY`（或 `apiKey`）                              | `model`、`batchSize`（默认 40）、`context`、`baseUrl`                |
| `deeplProvider(options?)`  | `DEEPL_API_KEY`（或 `apiKey`）。以 `:fx` 结尾的密钥使用免费 API | `formality`、`baseUrl`                                               |
| `openaiProvider(options?)` | `OPENAI_API_KEY` （或 `apiKey`；使用自定义 `baseUrl` 时可选）   | `model`、`batchSize`（默认 40）、`context`、`baseUrl`, `temperature` |
| `geminiProvider(options?)` | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` （或 `apiKey`）            | `model`、`batchSize`（默认 40）、`context`、`baseUrl`, `temperature` |

`openaiProvider` 调用 OpenAI Chat Completions API。设置 `baseUrl` 即可使用兼容 OpenAI 的服务器，例如 Azure OpenAI、Ollama 或 OpenRouter；此时密钥是可选的。每个提供者都自带默认模型（`claude-sonnet-5-5`、`gpt-4o-mini`、`gemini-2.5-flash`）。可通过 `model` 或环境变量 `OPENAI_MODEL` / `GEMINI_MODEL` 更改。

Claude、OpenAI 和 Gemini 提供者只针对模拟（mock）的 HTTP 测试过，没有针对真实服务测试，因此请对照各厂商当前的模型列表核对模型名称。

### 你自己的提供者

提供者是任何带有 `translate` 函数的对象，该函数按顺序为每个输入返回一条翻译：

```ts
translate: {
  provider: {
    name: "my-service",
    async translate(texts, from, to) {
      return await myService.translateAll(texts, from, to);
    },
  },
  sourceLocale: "en",
}
```

## 哪些内容会被翻译

当目标 locale 没有某个字符串的值，或其值仍以 `[TODO]` 开头时（参见 [`check --fix`](./check.md#fix)），该字符串就会被翻译。已有的翻译永远不会被覆盖。函数值不会被翻译。相同的源字符串对每个 locale 只发送一次。

## ICU 消息

使用 [ICU](../guide/icu.md) 复数或选择语法的字符串，只会发送给声明了 `supportsIcu: true` 的提供者（`claudeProvider`、`openaiProvider` 和 `geminiProvider` 声明了；`deeplProvider` 没有）。对其他提供者，它们会被跳过，并列在摘要中。自定义提供者通过 `supportsIcu: true` 选择加入。

只有当翻译后的 ICU 消息保持相同的参数和类型、每个 `select` 键以及每个精确的 `=N` 匹配时，才会被接受。复数类别可以增减，因为不同语言需要不同的类别。

## 安全检查

`{name}`、`%s`、`%1$d` 这样的占位符以及 HTML 标签必须在翻译后保留下来。丢失或更改其中任何一个的结果会被拒绝，保持不变，并列在摘要中，空结果也是如此。

之后请在版本控制中审阅这些更改。机器翻译只是一个起点，而不是最终答案。
