# Locale 回退

当词典没有所请求 locale 的内容时，Dialex 会沿着一条回退链查找，而不是直接跳到默认值：

1. locale 本身（`pt-BR`）
2. 配置中为它显式指定的回退，按顺序
3. 它的子标签截断（`pt-BR` → `pt`）
4. 显式回退的截断
5. `defaultLocale`

如果都不匹配，则使用词典中定义的第一个 locale。

```ts
// dialex.config.ts
import { defineConfig } from "dialex";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "es", "pt"],
  fallbacks: {
    "pt-BR": ["pt", "es"],
    gl: ["es"],
  },
});
```

例如，对于有土耳其语词典的项目，`tr-TR` 请求无需任何配置就会解析为 `tr`；没有加利西亚语内容时，`gl` 请求会解析为 `es`。

每当内容来自与请求不同的 locale 时，都会记录一条警告。

## 适配器

服务器适配器也直接接受 `fallbacks`，当你传入 `dictionaries` 而不依赖配置文件时很有用：

```ts
app.use(i18n({ dictionaries, locales: ["en", "es"], fallbacks: { pt: ["es"] } }));
```

回退适用于词典查找。[Locale 检测](./locale-detection.md)仍然只会返回 `locales` 中列出的 locale。
