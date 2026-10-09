# Extensión de VS Code

La extensión de Dialex añade compatibilidad del editor para las traducciones: diagnósticos, información al pasar el cursor (hover), ir a la definición, autocompletado y correcciones rápidas. Está en `packages/vscode` del repositorio.

::: warning Estado
La extensión se compila, se empaqueta en un `.vsix` y su lógica está cubierta por pruebas que se ejecutan contra un sustituto de la API de VS Code. **Todavía no se ha probado en una ventana real de VS Code** y no está publicada en el Marketplace. Sigue [Pruébala](#try-it-out) para ejecutarla tú mismo e informa de cualquier cosa que parezca incorrecta.
:::

## Instalación

Compila y empaqueta la extensión, y luego instala el `.vsix`:

```bash
cd packages/vscode
bun run build
bun run package                      # creates dialex-vscode-0.1.0.vsix
code --install-extension dialex-vscode-0.1.0.vsix
```

## Funciones

### Diagnósticos

Los problemas se subrayan donde están:

| En                       | Problema                                                                                                                                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un archivo `.content.ts` | A un locale le falta una clave que otro locale tiene, o falta un locale configurado; [ICU](./icu.md) no válido; argumentos que difieren entre locales; marcadores `[TODO]` dejados por `dialex check --fix`; traducciones cuyo texto de origen cambió desde que se tradujeron |
| Código fuente            | `getDictionary("x")` o `t("x.y")` que no apunta a nada                                                                                                                                                                                                                        |

Las categorías de plural que faltan para un idioma (por ejemplo `few` en ruso) se notifican como advertencias. Con `dialex.unusedKeys` activado, las claves y los diccionarios que ningún archivo fuente parece usar se atenúan.

### Hover

Pasa el cursor sobre una clave en `t("home.title")`, un nombre de diccionario en `getDictionary("home")` o un miembro de la llamada, como `.title` en `getDictionary("home").title`. Una tabla muestra el texto en cada locale (primero el locale por defecto) y marca los locales en los que falta. Los valores de tipo función muestran su código fuente.

### Ir a la definición

`F12` o ctrl/cmd + clic sobre una clave salta al lugar donde está escrita en el diccionario (la entrada del locale por defecto, o el primer locale que la tiene).

### Autocompletado

Dentro de la cadena de `t("…")`, `getDictionary("…")`, `useDictionary("…")` o `@DialexDictionary("…")`:

- nombres de diccionario, con el número de claves y de locales;
- después de `t("home.`, las claves de ese nivel, con el texto del locale por defecto como vista previa. Los grupos continúan con un punto y vuelven a abrir la lista.

### Correcciones rápidas

Usa la bombilla (`Ctrl+.`/`Cmd+.`) sobre un diagnóstico:

- **Add "nav.contact" to tr (marked [TODO])** copia el valor del locale por defecto, igual que [`dialex check --fix`](../cli/check.md#fix).
- **Add all N missing keys** lo hace para todo el archivo.
- **Add "nav.pricing" to the "home" dictionary** (en una ruta `t()` desconocida) crea la clave en todos los locales como marcador `[TODO]`.

Las correcciones reemplazan el texto del archivo en el editor, por lo que se pueden deshacer, y no se escribe nada hasta que guardas.

## Ajustes

| Ajuste                | Valor por defecto | Descripción                                                                                                                                                   |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialex.enable`       | `true`            | Activa o desactiva todas las funciones                                                                                                                        |
| `dialex.unusedKeys`   | `false`           | Atenúa las claves y los diccionarios posiblemente sin usar. Es una heurística basada en coincidencia de palabras, por eso está desactivado por defecto        |
| `dialex.autoGenerate` | `true`            | Regenera `dialex.generated.ts` y `dialex-env.d.ts` cuando cambia un diccionario o un archivo de configuración, en proyectos que ya tienen un archivo generado |
| `dialex.configPath`   | `""`              | Ruta del archivo de configuración, relativa a la raíz de cada proyecto                                                                                        |

El comando **Dialex: Refresh Diagnostics** vuelve a analizarlo todo. Los diagnósticos también se actualizan cuando guardas un archivo o cuando cambia un diccionario o un archivo de configuración.

El comando **Dialex: Regenerate dialex.generated.ts** lo hace bajo demanda. La generación automática lee la configuración desde el árbol de sintaxis y nunca la ejecuta, se omite en espacios de trabajo no confiables y solo toca proyectos que ya tienen un archivo generado, así que nunca crea archivos que no hayas pedido.

## Proyectos

Un proyecto es una carpeta con un `dialex.config.*` o `i18n.config.*`. Un diccionario que no contiene ningún proyecto configurado pertenece a la carpeta más cercana con un `package.json`, con la configuración por defecto. En un monorepo cada proyecto se analiza por separado y un diccionario pertenece al más cercano.

## Nunca ejecuta tu código

La extensión lee tu configuración y tus diccionarios del árbol sintáctico y **nunca ejecuta código del proyecto**. Por eso puede declarar compatibilidad con espacios de trabajo no confiables, y es importante porque los archivos de configuración y los diccionarios son código.

La contrapartida es que solo se entienden los valores visibles de forma estática:

- En `dialex.config`, `defaultLocale`, `locales`, `include`, `fallbacks`, `prefixDefault` y `lazy` deben ser literales. Todo lo calculado se ignora y se anota en el canal de salida **Dialex**.
- Un diccionario que usa spreads, claves calculadas o valores importados no se puede analizar. Recibe una nota informativa en lugar de diagnósticos. [`dialex check`](../cli/check.md) sí importa esos archivos y los comprueba.

El mismo análisis está disponible por código como `@dialexjs/cli/api` (`analyzeProject`, `readStaticConfig` y los helpers de edición de diccionarios).

<a id="try-it-out"></a>

## Pruébala

Para ejecutar la extensión desde el código fuente en una ventana real de VS Code:

1. Abre la carpeta `packages/vscode` en VS Code.
2. Pulsa `F5` ("Run Extension (examples)"). Esto compila la extensión y abre una segunda ventana sobre la carpeta `examples/` del repositorio.
3. En esa ventana, abre un ejemplo, por ejemplo `examples/react/src`:
   - Elimina una clave del bloque `tr` de `home.content.ts`: aparece un subrayado rojo en `tr` y la corrección rápida vuelve a añadir la clave.
   - Pasa el cursor sobre una llamada `t("home.…")` o pulsa `F12` sobre ella.
   - Escribe `t("home.` en un archivo `.tsx` y revisa las sugerencias.
4. Abre el canal de salida **Dialex** para ver notas sobre cualquier cosa que no se haya podido leer de forma estática.
