# 词典

词典是一个具名对象，把每个 locale 映射到对应的内容。文件通过 `include` glob 查找（默认 `**/*.content.ts`）。

```ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Hello" },
  tr: { title: "Merhaba" },
});
```

`defineDictionary` 有两种调用形式：

```ts
defineDictionary("home", { en: {...}, tr: {...} });
defineDictionary({ name: "home", dictionary: { en: {...}, tr: {...} } });
```

两种形式都返回 `{ name, dictionary }`，并把词典注册到进程内的 `globalDictionaries` 映射中。

<a id="values"></a>

## 值

值可以是字符串、嵌套对象或函数。函数可以提供带类型的插值：

```ts
en: {
  greeting: (name: string) => `Hello, ${name}!`,
  items: (n: number) => (n === 1 ? "1 item" : `${n} items`),
}
```

## Locale 一致性

每个词典都应该为每个 locale 定义相同的键。在 CI 中运行 [`dialex check`](../cli/check.md) 来强制执行；它也会报告词典缺少的已配置 locale。

## 规则

- **名称是字面量，且唯一。** `defineDictionary("home", ...)`：字符串字面量，而不是变量或表达式。它是每个[键路径](./key-paths.md)的第一段，也是 `getDictionary` 的参数。两个同名词典会冲突：只有一个可被访问。
- **每个文件一个默认导出。** `dialex generate` 通过 `include` glob 找到词典，并读取每个文件的默认导出。
- **每个 locale 都有相同的键。** [`dialex check`](../cli/check.md) 会报告不满足这一点的情况。
- **键不能包含点。** 点是键路径的分隔符，因此 `"nav.about"` 是带有 `about` 键的嵌套 `nav` 对象，而不是一个键。

<a id="what-the-tools-can-read"></a>

## 工具能读取什么

`dialex generate`、`dialex check`、编辑器扩展和语言服务器从**语法树**读取你的词典，而不运行它们。这使它们既快又可以安全地在编辑器中运行。这也意味着它们只能理解以普通值写出的内容：

| 在词典文件中                                              | 能否静态读取？ |
| --------------------------------------------------------- | -------------- |
| `defineDictionary("home", { en: { ... }, tr: { ... } })`  | 能             |
| `defineDictionary({ name: "home", dictionary: { ... } })` | 能             |
| 嵌套对象、字符串字面量、函数和方法                        | 能             |
| locale 或其内容中任何位置的 `...shared`（展开）           | 不能           |
| 计算键：`[key]: "..."`                                    | 不能           |
| 内容是变量或导入的 locale：`en: enStrings`                | 不能           |
| 不是字符串字面量的名称                                    | 不能           |

无法静态读取的词典并没有错；工具只是需要运行它。`dialex check` 会这样做（它会导入该文件），原生二进制会把命令交给 Node CLI，而编辑器会把该文件报告为“无法分析”并跳过它，因此它的键没有诊断、悬停或补全。如果你希望到处都有编辑器支持，请把词典保持为字面量对象，并通过在叶子内部调用的函数或辅助函数来共享文本，而不是展开对象。
