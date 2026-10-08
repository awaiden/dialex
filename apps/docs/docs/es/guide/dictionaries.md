# Diccionarios

Un diccionario es un objeto con nombre que asocia cada locale con su contenido. Los archivos se descubren mediante el glob `include` (por defecto `**/*.content.ts`).

```ts
import { defineDictionary } from "dialex";

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

Todos los diccionarios deberían definir las mismas claves para cada locale. Ejecuta [`dialex check`](../cli/check.md) en CI para exigirlo. Cuando `locales` está definido en la configuración, el plugin de Vite también lanza un error en tiempo de compilación si a un diccionario le falta un locale configurado.
