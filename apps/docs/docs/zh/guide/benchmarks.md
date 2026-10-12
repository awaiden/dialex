# 基准测试

i18n 库中运行在用户浏览器和你的服务器上的那部分的数据：一条消息的格式化速度，以及库给包增加了多少字节。它们把 Dialex 与 [i18next](https://www.i18next.com)、[intl-messageformat](https://formatjs.github.io)（`react-intl` 背后的 FormatJS 核心）、[Lingui](https://lingui.dev)、[Paraglide JS](https://paraglidejs.com) 和 [Intlayer](https://intlayer.org) 做比较。

::: tip 把它当作参考，而不是结论
微基准只在一台机器上测量一件事。你的应用的开销通常在别处：渲染、网络、数据。用这些数字来相互比较各个库，并在依赖它们之前在你自己的硬件上运行基准测试。
:::

## 测量内容

四条消息，由每个库用相同的值以英文格式化。在计时之前，运行器会检查所有库返回的文本相同。

| 情形 | 消息                                                          |
| ---- | ------------------------------------------------------------- |
| 查找 | `Hello, world`                                                |
| 插值 | `Hello, {name}!`                                              |
| 复数 | `{count, plural, =0 {No items} one {# item} other {# items}}` |
| 嵌套 | 对 `gender` 的 `select`，其中包含对 `count` 的 `plural`       |

每个库都按其文档推荐的方式使用：

- **dialexjs**：对 ICU 字符串使用 `t("dictionary.key", values)`。`function messages` 是 TypeScript 函数，`formatMessage` 是单独的格式化器。
- **dialexjs dictionary object**：`getDictionary("home").title`，返回解析后的词典。只适用于查找情形，因为带值的消息要经过 `t()`。`dictionary object` 从只获取一次的词典读取；`getDictionary per call` 在每次调用时解析词典。
- **i18next**：它自己的插值和复数键（`items_one`、`items_other`）。它没有内联的 `select`，因此不运行嵌套情形。
- **intl-messageformat**：每条消息只创建一次并复用的格式化器。`no cache` 在每次调用时都创建它，这就是应用不保留实例时发生的情况。
- **@lingui/core**：提前编译好的消息，就像 `lingui compile` 所做的那样。
- **Paraglide JS**：由 `paraglide-js compile` 编译成函数的消息（`m.plural({ count })`），使用默认的 inlang 消息格式。
- **Intlayer**：在 `.content.ts` 文件中声明并由 `intlayer build` 构建的内容。词典只读取一次，就像组件用 `useIntlayer` 那样。`getIntlayer per call` 在每次调用时读取。

## 吞吐量

每秒操作数，越高越好。预热 300 毫秒后，取 7 轮、每轮 400 毫秒的中位数。

Dialex 为绿色。柱形在同一张图内按比例绘制，因此请在同一张图内比较长度，而不要在不同图之间比较。

<BenchmarkChart metric="plural" title="复数" subtitle="每秒操作数，越高越好" unsupported="不支持" />

<BenchmarkChart metric="nested" title="嵌套的 select 和复数" subtitle="每秒操作数，越高越好" unsupported="不支持" />

<BenchmarkChart metric="interpolation" title="插值" subtitle="每秒操作数，越高越好" unsupported="不支持" />

<BenchmarkChart metric="lookup" title="查找" subtitle="每秒操作数，越高越好" unsupported="不支持" />

| 库                                |       查找 |       插值 |       复数 | 嵌套的 select 和复数 |
| --------------------------------- | ---------: | ---------: | ---------: | -------------------: |
| dialexjs                          | 43,519,557 | 12,182,375 |  1,314,654 |            1,224,797 |
| dialexjs (function messages)      | 29,402,418 | 20,147,608 | 26,145,040 |           16,089,639 |
| dialexjs formatMessage            | 39,919,266 | 17,307,720 |  1,411,691 |            1,383,457 |
| dialexjs (dictionary object)      | 76,879,058 |        n/a |        n/a |                  n/a |
| dialexjs (getDictionary per call) | 70,281,828 |        n/a |        n/a |                  n/a |
| i18next                           |    409,982 |    308,147 |    186,193 |                  n/a |
| intl-messageformat                | 18,011,740 |  4,011,251 |    431,958 |              394,071 |
| intl-messageformat (no cache)     |    220,488 |    166,977 |     22,984 |               18,178 |
| @lingui/core                      |  7,520,241 |  5,259,893 |    269,471 |              127,467 |
| Paraglide JS                      | 21,550,673 | 15,754,696 |     87,237 |               90,820 |
| Intlayer                          | 61,550,138 |  2,090,239 |  1,246,861 |            1,114,859 |
| Intlayer (getIntlayer per call)   |    398,154 |    330,110 |    301,829 |              297,055 |

使用 Node v24.21.0，在 Intel Core i5-11400H、Linux x64 上，于 2026-10-12 测得。

## 包大小

每个库中最小的有用程序：创建它、加载一条复数消息并格式化。用 esbuild 为浏览器打包并压缩。

<BenchmarkChart metric="size" title="包大小" subtitle="gzip 字节数，越低越好" />

| 程序                         |   压缩后 |     Gzip |   Brotli |
| ---------------------------- | -------: | -------: | -------: |
| dialexjs (t)                 |  7,227 B |  2,739 B |  2,486 B |
| dialexjs/icu (formatMessage) |  6,479 B |  2,401 B |  2,175 B |
| dialexjs (function messages) |  7,268 B |  2,757 B |  2,491 B |
| i18next                      | 43,666 B | 14,043 B | 12,726 B |
| intl-messageformat           | 33,567 B |  9,908 B |  8,883 B |
| Paraglide JS                 | 10,702 B |  3,952 B |  3,528 B |
| @lingui/core                 |  4,824 B |  2,087 B |  1,869 B |
| Intlayer                     | 17,207 B |  4,901 B |  4,381 B |

版本：dialexjs 0.7.2 加上运行时性能改动（编译后的消息格式化和共享 `Intl` 格式化器），i18next 26.4.3，intl-messageformat 12.1.3，@lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, intlayer 9.7.0, vite-intlayer 9.7.0。

## 如何解读这些数字

- **复数和数字是各个库的差别所在。** 复数需要一个 `PluralRules` 和一个数字格式化器。每次调用都创建它们很慢，所以 Dialex 为每个 locale 和选项保留一个。没有它时，复数情形约为每秒 36,000 次操作；有了它，约为 1,300,000 次。
- **函数消息跳过解析器。** 写成 TypeScript 函数的消息由 TypeScript 编译，因此复数和 select 的开销与模板字符串相同。
- **`t()` 比格式化器多做一点事。** `dialexjs` 在格式化之前会拆分带点的路径并查找键，所以单独的 `formatMessage` 在插值上更快；在查找上两者差别在噪声范围内。
- **i18next 每次调用做得更多。** 它在每次 `t()` 时解析回退链、命名空间和插件，这是你为功能集付出的代价。ICU 插件会改变它的数字；这个基准测试不使用它。
- **Paraglide JS 在其他库中插值最快。** 带值的消息被编译成模板字符串。它的复数代码在每次调用时创建一个新的 `Intl.PluralRules`（2.27.0 版），这正是 Dialex 去掉的开销，因此复数比它的插值慢得多（约每秒 87,000 次对 1600 万次操作）。
- **Intlayer 的查找只是一次属性读取。** 普通字符串不需要任何处理，所以它远远领先于需要查找路径或做格式化的库。插值、复数和 select 要经过节点函数，而每次调用都读取词典比只读取一次慢得多。读取 Dialex 的词典对象是同一种操作，量级也相同；一旦带值，`t()` 和 Intlayer 的节点函数就要做实际工作，各列的差别就在这里。
- **大小只针对运行时。** Lingui 的数字是针对提前编译的消息，不包含它的 `lingui` 工具链。Dialex 把解析器放在运行时，因此 ICU 字符串无需编译步骤即可工作。
- **Paraglide JS 和 Intlayer 用它们自己的构建工具测量。** Paraglide 的数字是一条编译后的消息加上它的运行时。Intlayer 需要它的打包器插件才能在浏览器中运行，因此用 `vite-intlayer` 和 `vanilla-intlayer` 构建。

## 自己运行

基准测试位于 `apps/benchmarks`。先构建一次各个包，然后运行：

```bash
bun run build:packages
bun run --cwd apps/benchmarks bench     # throughput
bun run --cwd apps/benchmarks size      # bundle size
```

结果会以 JSON 形式写入 `apps/benchmarks/results/`，并附上测量时使用的 Node 版本和 CPU。
