# dialex translate

Rellena las traducciones que faltan con un proveedor de traducción automática que tú configuras. No se envía nada a ningún sitio a menos que se defina un proveedor.

```bash
dialex translate --dry-run
dialex translate
dialex translate -l tr de
dialex translate -s en
dialex translate --stale
```

| Opción                      | Descripción                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `-l, --locale <locales...>` | Locales de destino (por defecto: todos los locales configurados excepto el de origen) |
| `-s, --source <locale>`     | Locale de origen (por defecto: `translate.sourceLocale`, y después `defaultLocale`)   |
| `--dry-run`                 | Enumera lo que se traduciría. No llama al proveedor ni escribe archivos               |
| `--stale`                   | Vuelve a traducir las cadenas cuyo texto de origen cambió (ver abajo)                 |
| `-c, --config <path>`       | Ruta de configuración personalizada                                                   |

## Configurar un proveedor

```ts
import { claudeProvider } from "@dialexjs/cli/translate";
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr", "de"],
  translate: {
    provider: claudeProvider({ context: "Banking app. Use a formal register." }),
  },
});
```

### Proveedores incluidos

| Proveedor                  | Credencial                                                                          | Opciones                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `claudeProvider(options?)` | `ANTHROPIC_API_KEY` (o `apiKey`)                                                    | `model`, `batchSize` (por defecto 40), `context`, `baseUrl`                |
| `deeplProvider(options?)`  | `DEEPL_API_KEY` (o `apiKey`). Las claves que terminan en `:fx` usan la API gratuita | `formality`, `baseUrl`                                                     |
| `openaiProvider(options?)` | `OPENAI_API_KEY` (o `apiKey`; opcional con un `baseUrl` personalizado)              | `model`, `batchSize` (por defecto 40), `context`, `baseUrl`, `temperature` |
| `geminiProvider(options?)` | `GEMINI_API_KEY` o `GOOGLE_API_KEY` (o `apiKey`)                                    | `model`, `batchSize` (por defecto 40), `context`, `baseUrl`, `temperature` |

`openaiProvider` llama a la API Chat Completions de OpenAI. Define `baseUrl` para usar un servidor compatible con OpenAI, como Azure OpenAI, Ollama u OpenRouter; en ese caso la clave es opcional. Cada proveedor incluye un modelo por defecto (`claude-sonnet-5-5`, `gpt-4o-mini`, `gemini-2.5-flash`). Cámbialo con `model` o con las variables de entorno `OPENAI_MODEL` / `GEMINI_MODEL`.

Los proveedores de Claude, OpenAI y Gemini solo se han probado con HTTP simulado (mock), no con los servicios reales, así que contrasta los nombres de modelo con la lista actual de cada proveedor.

### Tu propio proveedor

Un proveedor es cualquier objeto con una función `translate` que devuelve una traducción por cada entrada, en orden:

```ts
translate: {
  provider: {
    name: "my-service",
    async translate(texts, from, to) {
      return await myService.translateAll(texts, from, to);
    },
  },
  sourceLocale: "en",
}
```

## Qué se traduce

Una cadena se traduce cuando el locale de destino no tiene valor para ella, o cuando su valor aún empieza por `[TODO]` (consulta [`check --fix`](./check.md#fix)). Las traducciones existentes nunca se sobrescriben. Los valores de tipo función no se traducen. Las cadenas de origen idénticas se envían una sola vez por locale.

<a id="keeping-translations-in-sync"></a>

## Mantener las traducciones al día

`dialex translate` solo rellena las cadenas que faltan. Para detectar cuándo cambia después el texto _de origen_, Dialex guarda un archivo de bloqueo, `dialex.lock.json`, junto a tu configuración. Registra un hash corto del texto de origen a partir del cual se hizo cada traducción.

```json
{ "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
```

- `dialex translate` y [`dialex import`](./import.md) registran lo que escriben.
- `dialex lock` registra las traducciones que ya tienes (ejecútalo una vez para adoptar el archivo de bloqueo). Las traducciones que ya están desactualizadas se dejan como están; `dialex lock --all` las acepta.
- [`dialex check`](./check.md) avisa de cada traducción cuyo texto de origen cambió desde que se registró, y `--fail-on-stale` lo convierte en error. Las traducciones sin registro, como las escritas a mano, nunca se señalan.
- `dialex translate --stale` vuelve a traducir las cadenas desactualizadas. Solo ellas pueden reemplazar una traducción existente.

Haz commit de `dialex.lock.json` para que todo el equipo vea el mismo estado.

## Mensajes ICU

Las cadenas que usan la sintaxis de plural o select de [ICU](../guide/icu.md) solo se envían a los proveedores que declaran `supportsIcu: true` (`claudeProvider`, `openaiProvider` y `geminiProvider` lo hacen; `deeplProvider` no). Para los demás proveedores se omiten y se enumeran en el resumen. Los proveedores personalizados se adhieren con `supportsIcu: true`.

Un mensaje ICU traducido solo se acepta cuando conserva los mismos argumentos y tipos, todas las claves de `select` y todas las coincidencias exactas `=N`. Las categorías de plural se pueden añadir o quitar, porque cada idioma necesita las suyas.

## Comprobaciones de seguridad

Los marcadores como `{name}`, `%s`, `%1$d` y las etiquetas HTML deben sobrevivir a la traducción. Un resultado que elimina o cambia alguno se rechaza, se deja sin cambios y se enumera en el resumen, igual que un resultado vacío.

Revisa después los cambios en el control de versiones. La traducción automática es un punto de partida, no una respuesta final.
