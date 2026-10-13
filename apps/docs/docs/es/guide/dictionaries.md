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

## Reglas

- **El nombre es un literal y es único.** `defineDictionary("home", ...)`: un literal de cadena, no una variable ni una expresión. Es el primer segmento de cada [ruta de clave](./key-paths.md) y el argumento de `getDictionary`. Dos diccionarios con el mismo nombre colisionan: solo uno es accesible.
- **Un export por defecto por archivo.** `dialex generate` encuentra los diccionarios con el glob `include` y lee el export por defecto de cada archivo.
- **Cada locale tiene las mismas claves.** [`dialex check`](../cli/check.md) informa de las que no.
- **Las claves no pueden contener puntos.** Un punto es el separador de una ruta de clave, así que `"nav.about"` es un objeto `nav` anidado con una clave `about`, no una sola clave.

<a id="what-the-tools-can-read"></a>

## Qué pueden leer las herramientas

`dialex generate`, `dialex check`, la extensión del editor y el servidor de lenguaje leen tus diccionarios desde su **árbol de sintaxis**, sin ejecutarlos. Eso es lo que los hace rápidos y seguros para ejecutarse en un editor. También significa que solo pueden entender lo que está escrito como valores simples:

| En el archivo del diccionario                                               | ¿Se lee de forma estática? |
| --------------------------------------------------------------------------- | -------------------------- |
| `defineDictionary("home", { en: { ... }, tr: { ... } })`                    | Sí                         |
| `defineDictionary({ name: "home", dictionary: { ... } })`                   | Sí                         |
| Objetos anidados, literales de cadena, funciones y métodos                  | Sí                         |
| `...shared` (un spread) en los locales o en su contenido                    | No                         |
| Claves calculadas: `[key]: "..."`                                           | No                         |
| Un locale cuyo contenido es una variable o una importación: `en: enStrings` | No                         |
| Un nombre que no es un literal de cadena                                    | No                         |

Un diccionario que no se puede leer de forma estática no está mal; las herramientas simplemente tienen que ejecutarlo. `dialex check` lo hace (importa el archivo), y el editor informa del archivo como "no analizable" y lo omite, así que no tiene diagnósticos, hover ni autocompletado para sus claves. Si quieres soporte del editor en todas partes, mantén los diccionarios como objetos literales y comparte texto con una función o un ayudante que se llame dentro de una hoja, en lugar de usar spread de objetos.
