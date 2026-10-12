# Preguntas frecuentes

Respuestas cortas, con enlaces a la página que tiene el detalle.

## Diseño

### ¿Por qué los diccionarios son archivos TypeScript y no JSON?

Para que el compilador pueda comprobarlos. Un diccionario es código: sus claves están tipadas, un valor puede ser una función con parámetros tipados y los editores pueden saltar de `t("home.title")` a la definición. JSON sigue disponible en los extremos: [`dialex export`](../cli/export.md) escribe JSON, CSV o XLIFF para traductores y [`dialex import`](../cli/import.md) devuelve su trabajo a los archivos TypeScript.

### ¿Puedo cargar traducciones desde una API o una base de datos en ejecución?

Dialex está pensado para traducciones que se distribuyen con la app. Un diccionario es cualquier objeto, así que puedes rellenar uno tú mismo y pasarlo como `dictionaries` a un adaptador o proveedor, pero entonces no está tipado, comprobado ni generado por ti. Para contenido que cambia sin desplegar, usa tu CMS y deja las cadenas de la interfaz en Dialex.

### ¿Cuánto pesa el runtime?

La función `t()` con el analizador y formateador ICU pesa unos 8 KB minificado (3 KB gzip); `dialexjs/icu` solo, unos 7 KB. Los adaptadores de framework son pequeños sobre eso. Consulta [Benchmarks](./benchmarks.md) para las cifras medidas y la comparación con otras bibliotecas.

### ¿Funciona con renderizado en el servidor?

Sí. Los adaptadores de servidor resuelven el locale por petición, y los proveedores de UI aceptan un `initialLocale` para que el primer render del cliente coincida con el del servidor. Un locale recordado se aplica después del montaje, a propósito, para que la hidratación nunca difiera. Consulta la [página de tu framework](../frameworks/README.md).

## Locales

### ¿Cómo añado un idioma?

1. Añádelo a `locales` en `dialex.config.ts`.
2. Ejecuta `dialex check --fix`: cada diccionario recibe las claves que faltan, copiadas del locale por defecto y marcadas con `[TODO]`.
3. Tradúcelas: a mano, con [`dialex translate`](../cli/translate.md) y un proveedor, o mediante [`export`/`import`](../cli/export.md).
4. Ejecuta `dialex generate` y `dialex check`.

### ¿Dialex elige el idioma a partir del navegador?

En el servidor, sí: los adaptadores leen `Accept-Language`, la URL, la cadena de consulta y las cookies, en ese [orden](./locale-detection.md). En el navegador los proveedores no leen `navigator.language`: usan el locale que resolvió el servidor y la elección del usuario (guardada en una cookie o en `localStorage`). React Native toma los idiomas del dispositivo mediante `deviceLocales`.

### ¿Qué pasa cuando falta una traducción?

La búsqueda sigue la [cadena de fallback](./fallbacks.md): el propio locale, los `fallbacks` explícitos, el idioma sin región (`pt-BR` a `pt`) y luego el locale por defecto. Si nada tiene la clave, `t()` avisa y devuelve la ruta. `dialex check` informa de las claves que faltan para que no lleguen a producción.

### ¿Admite idiomas de derecha a izquierda?

Dialex traduce texto y formatea números y fechas; no establece la dirección del texto. Los proveedores mantienen `<html lang>` sincronizado con el locale. Deriva `dir` del locale tú mismo, por ejemplo `dir={["ar", "he", "fa"].includes(locale) ? "rtl" : "ltr"}`.

### ¿Cómo funcionan los plurales en idiomas con muchas formas?

Los mensajes usan `plural` y `selectordinal` de ICU con las reglas CLDR del locale, mediante `Intl.PluralRules`. El ruso necesita `one`, `few`, `many` y `other`; el árabe tiene seis categorías. `dialex check` avisa cuando a un mensaje le falta una categoría que su idioma necesita. Consulta [Mensajes ICU](./icu.md).

## Flujo de trabajo

### ¿Tengo que ejecutar `dialex generate` todo el tiempo?

Ejecuta `dialex generate --watch` mientras desarrollas, o usa la [extensión de VS Code](./vscode.md), que regenera al guardar. En CI, ejecuta `dialex check`: falla cuando los archivos generados están desactualizados.

### ¿Dónde debo confirmar los archivos generados?

Ambas opciones funcionan. Confirmarlos significa que un clon nuevo pasa la comprobación de tipos sin paso de build; ignorarlos significa que cada instalación debe ejecutar `dialex generate`. `dialex check` compara los archivos generados con lo que escribiría `generate`, así que si los confirmas, la CI los mantiene al día.

### ¿Cómo trabajan los traductores con esto?

Dales la salida de [`dialex export`](../cli/export.md) (JSON, CSV o XLIFF); nunca ven TypeScript. Recupera su trabajo con [`dialex import`](../cli/import.md), que valida los mensajes ICU y rechaza claves desconocidas. O deja que un proveedor traduzca con [`dialex translate`](../cli/translate.md) y usa `dialex lock` para notar cuándo cambia un texto de origen después.

### ¿`dialex translate` envía mi código a alguna parte?

No. No se envía nada a menos que configures un proveedor, y entonces solo las cadenas por traducir (no tu código) van a ese proveedor, por lotes. `dialex translate --dry-run` lista lo que se enviaría.

### ¿Puedo usarlo en un monorepo?

Sí. Cada paquete con un `dialex.config.*` (o solo archivos `*.content.ts`) es un proyecto. La CLI trabaja desde la carpeta en la que la ejecutas, y las herramientas del editor encuentran cada proyecto del espacio de trabajo y mantienen separados los proyectos anidados. Se respetan los `.gitignore` del repositorio.

## Herramientas

### ¿La CLI está escrita en Rust?

`dialex generate` y `dialex check` tienen una implementación nativa que produce la misma salida que la CLI de Node y es de 20 a 40 veces más rápida en proyectos grandes; todo lo demás se ejecuta en Node. Consulta [Binarios nativos](./native.md).

### ¿Por qué el editor omite uno de mis diccionarios?

No puede leerlo sin ejecutar código: usa un spread, una clave calculada, un valor importado o un nombre calculado. Usa objetos literales, o acepta que `dialex check` (que evalúa el archivo) sea la comprobación para ese archivo. Consulta [Diccionarios](./dictionaries.md#what-the-tools-can-read).

### ¿Qué significa "pre-1.0" para mí?

La API puede cambiar entre versiones menores. Los cambios incompatibles salen en una versión menor, figuran en el [changelog](./changelog.md), y las versiones de parche siguen siendo compatibles. Fija la versión menor que uses.
