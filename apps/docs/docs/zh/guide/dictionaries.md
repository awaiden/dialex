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
