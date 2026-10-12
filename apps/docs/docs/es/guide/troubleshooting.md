# Solución de problemas

Busca el síntoma, lee la causa y aplica la solución. Los problemas de un framework concreto están en la página de ese framework; el resto están aquí. Para saber qué significa un mensaje de `check`, consulta la [referencia de diagnósticos](./diagnostics.md).

## Tipos y archivos generados

### `t("home.title")` o `getDictionary("home")` no se autocompleta ni tiene tipo

Los tipos salen de `dialex-env.d.ts`, que escribe `dialex generate`. Comprueba, por orden:

1. El archivo existe: ejecuta `dialex generate`.
2. TypeScript lo incluye. Añádelo (o su carpeta) a `include` en `tsconfig.json` y reinicia el servidor de TypeScript del editor.
3. `moduleResolution` es `"bundler"`, `"node16"` o `"nodenext"` (consulta [Requisitos](./requirements.md)).
4. El archivo generado está al día: ejecuta `dialex generate --watch` o usa la extensión del editor, que regenera al guardar.

### Cambié un diccionario y los tipos no se actualizaron

Nada reconstruye los archivos generados por ti. Ejecuta `dialex generate`, mantén `dialex generate --watch` en marcha o usa la [extensión de VS Code](./vscode.md). `dialex check` informa de un archivo desactualizado como error, así que una ejecución de CI lo detecta.

### `Cannot find module 'dialexjs/react'` (u otra subruta)

`moduleResolution` es `"node"` (también llamado `node10`), que no lee el mapa `exports` del paquete. Cámbialo a `"bundler"` o `"nodenext"`.

### `dialex check` dice que el archivo generado está desactualizado, pero acabo de generarlo

Puede que un formateador (Prettier, Biome, oxfmt) lo haya reescrito. `check` ignora espacios, comillas y comas finales, así que el formato por sí solo no lo causa: busca `locales` o `include` distintos, un diccionario cambiado tras la última ejecución, o un `dialex generate` con `-o` mientras `check` mira la ruta por defecto. Añade los archivos generados a la lista de exclusión de tu formateador para evitar diffs molestos.

## Locales y diccionarios

### `[dialex] Dictionary "x" not found`

El diccionario no está en `dialex.generated.ts`. Comprueba que su archivo coincide con `include` (por defecto `**/*.content.ts`), no está excluido por `.gitignore` ni `exclude`, usa `export default defineDictionary("x", ...)` y que el nombre coincide exactamente. Luego ejecuta `dialex generate`.

### `[dialex] Locale "tr" not found in dictionary "x", using "en"`

El diccionario no tiene contenido `tr`, así que se usó la [cadena de fallback](./fallbacks.md). Añade el locale, o ejecuta `dialex check --fix` para crear las claves que faltan.

### La app siempre renderiza el locale por defecto

Ninguna fuente produjo un locale admitido. El orden de detección es un extractor propio, el primer segmento de la URL, `?locale=` / `?lang=`, la cookie `locale` / `lang` y luego `Accept-Language`. Comprueba: `locales` está definido (sin él se ignora un prefijo de ruta como `/tr`), el cliente realmente envía la cookie o la cabecera y el adaptador está registrado antes de las rutas. Consulta [Detección de locale](./locale-detection.md).

### El locale cambia en el cliente pero el servidor renderiza otro

El servidor y el cliente resuelven el locale por separado. Pasa al proveedor el locale con el que renderizó el servidor como `initialLocale`, para que el primer render del cliente coincida. Un locale recordado se aplica después del montaje, a propósito, para que la hidratación coincida.

### `useDialex must be used within a DialexProvider`

El componente se renderiza fuera del proveedor. Pon `<DialexProvider {...dialex}>` en la raíz, por encima de todo componente que use un hook, e importa los hooks del mismo punto de entrada que el proveedor.

### El diccionario está vacío en el primer render

Usas carga `lazy`, así que un diccionario está vacío (o, en React, suspende) hasta que se ha cargado. Nombra los diccionarios que lees (`useT("home")`), envuelve React en `<Suspense>` o llama a [`preloadDictionaries`](../api/client-frameworks.md#preloaddictionaries) antes de renderizar. Consulta [Carga diferida](./lazy-loading.md).

## Mensajes

### `t("cart.items", { count })` devuelve el mensaje sin formatear

O la cadena no se pudo analizar (la consola muestra `[dialex] Could not format ...`) o no se pasó un objeto de valores: una cadena sin valores se devuelve tal cual. Ejecuta `dialex check` para ver el error ICU exacto.

### Las llaves o apóstrofos literales salen mal

En ICU, `{` y `}` abren y cierran argumentos, y `'` los entrecomilla. Escribe una llave literal como `'{'` y un apóstrofo como `''`. Un `'` suelto antes de una letra se conserva tal cual. Consulta [Mensajes ICU](./icu.md).

### Un plural muestra la forma incorrecta en otro idioma

El idioma necesita categorías que tu mensaje no da (el ruso necesita `few` y `many`, el árabe seis). `dialex check` avisa con `icu-plural-categories`. Añade las opciones; `other` es el respaldo.

## CLI y binarios nativos

### `dx` va lento, o quiero saber si se ejecuta el binario nativo

Ejecuta `DIALEX_NATIVE=1 dx check`: si falla con `native check declined`, el motivo está en el mensaje. Consulta [Binarios nativos](./native.md).

### `dialex: this command needs the Node CLI (@dialexjs/cli), which was not found`

El binario nativo se inició por sí solo, sin la CLI de Node a su lado. Instala `@dialexjs/cli` en el proyecto, define `DIALEX_NODE_CLI` con su `dist/index.mjs` o usa `DIALEX_NATIVE=0`.

### `dx` se ejecuta en Node aunque instalé el paquete

El paquete de la plataforma no se instaló (`--no-optional`, una plataforma no admitida o Alpine/musl) o la plataforma no es compatible. `npm ls @dialexjs/cli-linux-x64` (usa tu plataforma) muestra si está. El resultado es el mismo, solo que más lento.

### `dialex check` no informa de nada para un diccionario

El diccionario usa spreads, claves calculadas o valores importados y no se pudo leer desde el árbol de sintaxis. `dialex check` evalúa un archivo así; el editor lo omite. Consulta [Diccionarios](./dictionaries.md#what-the-tools-can-read).

### `dialex translate` dice que no hay proveedor configurado

Define `translate.provider` en `dialex.config.ts`. Consulta [`dialex translate`](../cli/translate.md).

## Editores

### El editor no muestra diagnósticos, hover ni autocompletado

- El espacio de trabajo no tiene un proyecto Dialex: necesita un `dialex.config.*`, o un archivo `*.content.ts` junto a un `package.json`.
- La extensión o el servidor están desactivados: comprueba el ajuste `dialex.enable`.
- El diccionario usa spreads o claves calculadas: se informa como no analizable y se omite.
- El archivo lo ignora `.gitignore` o `exclude`.
- El servidor de lenguaje no arrancó: en Zed necesita Node.js; mira el log del servidor para ver el motivo.

### Las claves sin usar nunca aparecen

Están desactivadas por defecto. Activa el ajuste `unusedKeys`; entonces aparecen como texto atenuado.

## Sigues atascado

Ejecuta `dialex check --json` y `dialex --version`, y abre un issue en [GitHub](https://github.com/awaiden/dialex/issues) con la salida, tu `dialex.config.*` y el diccionario más pequeño que muestre el problema.
