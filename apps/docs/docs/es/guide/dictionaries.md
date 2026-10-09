# Diccionarios

Un diccionario es un objeto con nombre que asocia cada locale con su contenido. Los archivos se descubren mediante el glob `include` (por defecto `**/*.content.ts`).

```ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Hello" },
  tr: { title: "Merhaba" },
});
```

`defineDictionary` tiene dos formas de llamada:

```ts
defineDictionary("home", { en: {...}, tr: {...} });
defineDictionary({ name: "home", dictionary: { en: {...}, tr: {...} } });
```

Ambas devuelven `{ name, dictionary }` y registran el diccionario en el mapa `globalDictionaries` del proceso.

<a id="values"></a>

## Valores

Los valores pueden ser cadenas, objetos anidados o funciones. Las funciones permiten una interpolación con tipos:

```ts
en: {
  greeting: (name: string) => `Hello, ${name}!`,
  items: (n: number) => (n === 1 ? "1 item" : `${n} items`),
}
```

## Paridad entre locales

Todo diccionario debe definir las mismas claves para cada locale. Ejecuta [`dialex check`](../cli/check.md) en CI para exigirlo; también informa de un locale configurado que falte en un diccionario.
