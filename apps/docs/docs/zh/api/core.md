# Core

`dialexjs` 入口点：配置、词典和 `t` 函数。格式化辅助函数在[格式化](./formatting.md)中，类型在[类型](./types.md)中。

## `defineConfig(config)`

```ts
function defineConfig(config: DialexConfig): DialexConfig;
```

为 `dialex.config.ts` 提供类型，并原样返回该对象。

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({ defaultLocale: "en", locales: ["en", "tr"] });
```

全部选项见[配置](../guide/configuration.md)。

## `defineDictionary(name, dictionary)`

```ts
function defineDictionary<N extends string, D extends Record<string, any>>(
  name: N,
  dictionary: D,
): DictionaryDefinition<N, D[keyof D]>;

function defineDictionary<N extends string, D extends Record<string, any>>(config: {
  name: N;
  dictionary: D;
}): DictionaryDefinition<N, D[keyof D]>;
```

| 参数         | 说明                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------- |
| `name`       | 词典名称：每个 `t()` 路径的第一段，也是 `getDictionary` 的参数。它必须唯一，并且是字面量 |
| `dictionary` | 把每个 locale 映射到其内容的对象：字符串、嵌套对象或函数                                 |

它会把词典注册到 [`globalDictionaries`](#globaldictionaries) 并返回 `{ name, dictionary }`。把每个词典作为默认导出放在各自的 `*.content.ts` 文件中，`dialex generate` 才能找到它。参见[词典](../guide/dictionaries.md)。

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Welcome", greeting: (name: string) => `Hello, ${name}!` },
  tr: { title: "Hoş geldiniz", greeting: (name: string) => `Merhaba, ${name}!` },
});
```

<a id="createt"></a>

## `createT(getDictionary, locale?)`

```ts
function createT(getDictionary: (name: any) => any, locale?: string): Translate;
```

在 `getDictionary(name)` 访问器之上构建 `t("dictionary.key.path", ...args)` 函数。框架适配器会替你完成这一步；在脚本或测试中可以自己调用。

| 参数            | 说明                                       |
| --------------- | ------------------------------------------ |
| `getDictionary` | 返回名为 `name` 的词典在该 locale 下的内容 |
| `locale`        | 用于格式化 ICU 消息的 locale。默认 `"en"`  |

`t(path, ...args)` 的返回值：

| 路径指向                       | 结果                                                                      |
| ------------------------------ | ------------------------------------------------------------------------- |
| 函数                           | `fn(...args)`：额外的参数传给该函数                                       |
| 字符串且没有值对象             | 原样返回字符串，不做任何解析                                              |
| 字符串且有值对象（`{ n: 3 }`） | 按 `locale` 作为 [ICU 消息](../guide/icu.md)格式化后的字符串              |
| 不存在                         | `console.warn("[dialex] Translation path ... not found.")` 并返回路径本身 |

无法格式化的字符串（无效的 ICU 或缺少值）会用 `console.warn` 报告并原样返回，因此一个有问题的字符串不会让整个页面崩溃。参见[键路径](../guide/key-paths.md)。

## `globalDictionaries`

```ts
const globalDictionaries: Record<string, Record<string, any>>;
```

`defineDictionary` 填充的进程内注册表。当你没有向适配器传入 `dictionaries` 时，它们会读取这里。在词典文件被导入之前它是空的，因此传递词典的可靠方式是生成的 `dialex` 对象。

## `DEFAULT_CONFIG`

```ts
const DEFAULT_CONFIG: {
  defaultLocale: string; // "en"
  locales: string[]; // []
  include: string | string[]; // "**/*.content.ts"
  fallbacks: Record<string, string[]>; // {}
  prefixDefault: boolean; // true
  lazy: boolean | "locale"; // false
};
```

所有工具在某项设置缺失、或整个配置文件缺失时使用的值。`locales` 为空：此时 `dialex generate` 会使用你的词典所定义的 locale。

## 配置类型

### `DialexConfig`

`dialex.config.ts` 的结构。所有字段都是可选的。

| 字段            | 类型                       | 默认值              | 说明                                                             |
| --------------- | -------------------------- | ------------------- | ---------------------------------------------------------------- |
| `defaultLocale` | `string`                   | `"en"`              | 无法解析出任何 locale 时使用的 locale                            |
| `locales`       | `string[]`                 | —                   | 支持的 locale                                                    |
| `include`       | `string \| string[]`       | `"**/*.content.ts"` | 词典文件的 glob                                                  |
| `exclude`       | `string[]`                 | —                   | 除 `node_modules`、构建输出和 `.gitignore` 外，永远不扫描的 glob |
| `output`        | `string`                   | `src/` 或项目根目录 | `dialex.generated.ts` 的写入位置                                 |
| `configFile`    | `string`                   | —                   | 配置文件的自定义路径                                             |
| `fallbacks`     | `Record<string, string[]>` | —                   | 显式的[回退链](../guide/fallbacks.md)                            |
| `prefixDefault` | `boolean`                  | `true`              | 默认 locale 是否也带 URL 前缀                                    |
| `lazy`          | `boolean \| "locale"`      | `false`             | 按需加载词典。参见[懒加载](../guide/lazy-loading.md)             |
| `translate`     | `TranslateConfig`          | —                   | [`dialex translate`](../cli/translate.md) 的设置                 |

### `TranslateConfig`

| 字段           | 类型                | 说明                                    |
| -------------- | ------------------- | --------------------------------------- |
| `provider`     | `TranslateProvider` | 负责翻译字符串的后端。必填              |
| `sourceLocale` | `string`            | 翻译的源 locale。默认为 `defaultLocale` |

### `TranslateProvider`

```ts
interface TranslateProvider {
  name?: string;
  supportsIcu?: boolean;
  translate(texts: string[], from: string, to: string): Promise<string[]>;
}
```

`translate` 接收普通字符串，并且必须按相同顺序为每个输入返回一条翻译。只有当 provider 能保持 `plural` 和 `select` 消息的结构完整时才设置 `supportsIcu`；带有这种语法的消息不会发送给不支持的 provider。参见 [`dialex translate`](../cli/translate.md)。

<a id="generated-file-types"></a>

## 生成文件的类型

| 类型                 | 说明                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexSource`       | 生成的 `dialex` 导出所包含、Provider 所接受的内容：`dictionaries`、`config`，以及懒加载模式下的 `loaders`                                     |
| `DialexClientConfig` | `dialex generate` 复制进 `dialex.generated.ts` 的设置：`defaultLocale`、`locales`、`fallbacks`、`prefixDefault`、`lazy`。不会包含 `translate` |
| `DictionaryLoader`   | `() => Promise<any>`：加载一个词典，或其中一个 locale                                                                                         |
| `DictionaryLoaders`  | 按词典名称组织的 loader。使用 `lazy: "locale"` 时，一个词典会把每个 locale 映射到各自的 loader                                                |
