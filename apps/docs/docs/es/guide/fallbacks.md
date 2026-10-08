# Locales de reserva (fallbacks)

Cuando un diccionario no tiene contenido para el locale solicitado, Dialex recorre una cadena de fallback en lugar de saltar directamente al locale por defecto:

1. el propio locale (`pt-BR`)
2. sus fallbacks explícitos de la configuración, en orden
3. sus truncamientos de subetiqueta (`pt-BR` → `pt`)
4. los truncamientos de los fallbacks explícitos
5. `defaultLocale`

Si nada coincide, se usa el primer locale definido en el diccionario.

```ts
// dialex.config.ts
import { defineConfig } from "dialex";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "es", "pt"],
  fallbacks: {
    "pt-BR": ["pt", "es"],
    gl: ["es"],
  },
});
```

Por ejemplo, una petición con `tr-TR` y un diccionario en turco se resuelve como `tr` automáticamente, sin configuración. Una petición con `gl` sin contenido en gallego se resuelve como `es`.

Se registra una advertencia siempre que el contenido proviene de un locale distinto del solicitado.

## Adaptadores

Los adaptadores de servidor también aceptan `fallbacks` directamente, lo que resulta útil cuando pasas `dictionaries` en lugar de depender del archivo de configuración:

```ts
app.use(i18n({ dictionaries, locales: ["en", "es"], fallbacks: { pt: ["es"] } }));
```

Los fallbacks se aplican a las búsquedas en diccionarios. La [detección de locale](./locale-detection.md) sigue devolviendo únicamente locales incluidos en `locales`.
