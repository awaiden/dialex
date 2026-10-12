# Linting con ESLint y oxlint

`@dialexjs/eslint-plugin` informa de los problemas de Dialex donde ya aparecen sus demás errores de lint: en la terminal, en la CI y en cualquier editor que ejecute ESLint u oxlint. Es un solo paquete para ambos linters, porque oxlint carga plugins al estilo de ESLint.

Necesita un `dialex.config.*` por encima del archivo analizado y no hace nada en proyectos que no lo tengan. Como `dialex check`, lee los diccionarios y la configuración del árbol sintáctico y nunca ejecuta código del proyecto.

## ESLint

Instálelo y añada su configuración a `eslint.config.js`:

```sh
npm install --save-dev @dialexjs/eslint-plugin
```

```js
import dialex from "@dialexjs/eslint-plugin";

export default [dialex.configs.recommended];
```

## oxlint

oxlint no tiene configuraciones compartibles, así que liste usted mismo el plugin y las reglas en `.oxlintrc.json`:

```json
{
  "jsPlugins": ["@dialexjs/eslint-plugin"],
  "rules": {
    "dialex/no-unknown-dictionary": "error",
    "dialex/no-unknown-path": "error",
    "dialex/no-dynamic-key": "warn",
    "dialex/valid-dictionary": "error"
  }
}
```

Los plugins JS de oxlint están en alfa y no ejecutan reglas de plugin en archivos `.vue`, `.svelte` ni `.astro`. `dialex check` y las extensiones de editor siguen cubriéndolos.

## Reglas

| Regla                          | Informa de                                                                                                  | `recommended` |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------- |
| `dialex/no-unknown-dictionary` | `getDictionary("x")`, `useDictionary("x")` o `@DialexDictionary("x")` nombra un diccionario que no existe   | `error`       |
| `dialex/no-unknown-path`       | `t("a.nope")` donde `a` es un diccionario conocido pero no tiene esa clave                                  | `error`       |
| `dialex/no-dynamic-key`        | Un nombre de diccionario o una clave que no es un literal de cadena, por lo que Dialex no puede comprobarlo | `warn`        |
| `dialex/valid-dictionary`      | Todo lo que `dialex check` encuentra en un archivo de diccionario                                           | `error`       |
| `dialex/no-literal-string`     | Texto escrito en JSX en lugar de venir de un diccionario                                                    | desactivada   |

### no-unknown-dictionary

La misma comprobación que el diagnóstico `unknown-dictionary`. Un diccionario registrado en el código con `dictionaries: { name: ... }` se considera conocido, y los comentarios nunca se comprueban.

### no-unknown-path

La misma comprobación que `unknown-path`. Las claves de diccionarios que Dialex no conoce se ignoran, porque `t()` puede pertenecer a otra biblioteca.

### no-dynamic-key

`getDictionary(name)` y ``t(`home.${key}`)`` no se pueden verificar. Un `t` suelto solo se comprueba en archivos que importan de `dialexjs`, ya que otras bibliotecas usan ese nombre.

### valid-dictionary

Se ejecuta en archivos de diccionario, sobre el texto del editor, e informa de los [códigos](./diagnostics.md) de diccionario como `missing-key`, `missing-locale`, `invalid-icu` y `todo-placeholder`. Las claves y diccionarios sin usar quedan para `dialex check`, que ve todo el proyecto. Omita códigos con `ignore`:

```json
{ "dialex/valid-dictionary": ["error", { "ignore": ["todo-placeholder"] }] }
```

### no-literal-string

Marca el texto JSX que contiene letras y los valores de `title`, `alt`, `placeholder`, `aria-label` y `label`. Está desactivada en `recommended` porque la mayoría de los proyectos tienen texto que puede quedarse. Opciones:

```json
{
  "dialex/no-literal-string": [
    "warn",
    { "attributes": ["title", "alt"], "ignore": ["^OK$"], "ignoreComponents": ["Trans", "code"] }
  ]
}
```

`attributes` sustituye la lista de atributos, `ignore` es una lista de expresiones regulares que se comparan con el texto recortado, e `ignoreComponents` nombra los elementos cuyo contenido se omite (por defecto `Trans`, `code`, `pre`, `script` y `style`).

## Configuración

Las reglas se configuran una sola vez, en `lint.rules` de `dialex.config.ts`. `dialex check`, las extensiones de editor y estas reglas de ESLint y oxlint lo leen, así que una comprobación está activada o desactivada, con las mismas opciones, en todas partes.

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lint: {
    rules: {
      "unused-key": "off",
      "missing-key": "warn",
      "literal-string": ["warn", { ignore: ["^OK$"] }],
    },
  },
});
```

Las claves son los [códigos de diagnóstico](./diagnostics.md), más `dynamic-key` y `literal-string`, que solo evalúa el plugin del linter. Un valor es `"off"`, `"warn"`, `"error"` o `[level, options]`. El nivel cambia cómo informan `dialex check` y los editores. En ESLint es la severidad que `dialex.configs.recommended` da a la regla, leída del `dialex.config.*` del directorio donde se ejecuta ESLint, y `literal-string` solo está activa en `recommended` si la define aquí.

oxlint lee las severidades de `.oxlintrc.json`, que no se puede calcular, así que liste allí las reglas con el nivel que quiera. `"off"` y las opciones de `dialex.config.ts` siguen aplicándose, de modo que una comprobación desactivada allí permanece en silencio. `valid-dictionary` es una regla para muchos códigos y el linter la muestra con un solo nivel; los niveles por código se aplican en `dialex check` y los editores. Las opciones que se pasan a una regla en la configuración del propio linter prevalecen sobre las de `dialex.config.ts`.

## Suprimir un aviso

Use los comentarios del propio linter, como `// eslint-disable-next-line dialex/no-unknown-dictionary`. Los comentarios `dialex-ignore` de [Diagnósticos](./diagnostics.md) son para `dialex check` y los editores, y el plugin no los lee.

## Editores

Si su editor ya muestra estos problemas desde ESLint u oxlint, desactive la copia propia de Dialex para ver cada uno una sola vez. El hover, el autocompletado y las correcciones rápidas siguen funcionando. En VS Code:

```json
{ "dialex.diagnostics": false }
```

En Zed, ponga `diagnostics` en `false` en `lsp.dialex.settings` ([Zed y otros editores](./zed.md)).
