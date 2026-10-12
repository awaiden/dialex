# Pruebas

Ayudantes para pruebas unitarias y de componentes. No necesitan plugin de bundler, archivo de configuración ni archivo generado, y nunca tocan cookies ni `localStorage`, así que las pruebas no se filtran estado entre sí. Hay ejemplos completos en [Pruebas](../guide/testing.md).

## `dialexjs/testing`

### `createTestDialex(options)`

```ts
function createTestDialex(options: TestDialexOptions): TestDialex;
```

| Opción          | Tipo                       | Por defecto     | Descripción                                                                              |
| --------------- | -------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| `dictionaries`  | `DictionaryInput`          | —               | Resultados de `defineDictionary`, o un mapa `{ name: { locale: content } }`. Obligatorio |
| `locale`        | `string`                   | `defaultLocale` | El locale activo                                                                         |
| `defaultLocale` | `string`                   | `"en"`          | Locale de respaldo                                                                       |
| `fallbacks`     | `Record<string, string[]>` | —               | [Cadenas de fallback](../guide/fallbacks.md) explícitas                                  |

Devuelve un `TestDialex`:

| Miembro               | Descripción                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `locale`              | El locale activo                                                    |
| `getDictionary(name)` | El contenido de un diccionario para el locale activo, con fallbacks |
| `t`                   | Una [función `t`](./core.md#createt) para el locale activo          |
| `withLocale(locale)`  | Un contexto nuevo sobre los mismos diccionarios bajo otro locale    |

```ts
const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });
expect(dialex.t("home.title")).toBe("Hoş Geldiniz");
expect(dialex.withLocale("en").getDictionary("home").title).toBe("Welcome");
```

### `mockRequest(url, options?)`

```ts
function mockRequest(url: string, options?: MockRequestOptions): Request;
```

Construye un `Request` estándar que un adaptador de servidor resuelve a `options.locale`. Las URL relativas se resuelven contra `http://localhost`.

| Opción    | Tipo                                        | Por defecto | Descripción                                                                                                  |
| --------- | ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `locale`  | `string`                                    | —           | El locale al que debe resolverse la petición                                                                 |
| `via`     | `"header" \| "cookie" \| "query" \| "path"` | `"header"`  | Cómo se transmite el locale: `Accept-Language`, la cookie `locale`, `?locale=` o un segmento de ruta inicial |
| `headers` | `Record<string, string>`                    | —           | Más cabeceras de la petición                                                                                 |
| `cookies` | `Record<string, string>`                    | —           | Más cookies                                                                                                  |
| `method`  | `string`                                    | `"GET"`     | Método HTTP                                                                                                  |
| `body`    | `BodyInit \| null`                          | —           | Cuerpo de la petición                                                                                        |

```ts
const res = await app.request(mockRequest("/dashboard", { locale: "tr", via: "cookie" }));
```

## `dialexjs/testing/react`

### `TestDialexProvider`

```tsx
function TestDialexProvider(props: TestDialexProviderProps): ReactElement;
```

`DialexProvider` para pruebas de componentes: renderiza `locale` de inmediato y nunca lee ni escribe cookies ni `localStorage`. Pásale el export `dialex` generado, o tus propios `dictionaries`.

| Prop                                | Tipo           | Descripción                                                                     |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `locale`                            | `string`       | El locale con el que renderizar. Por defecto, el locale por defecto configurado |
| `dictionaries`, `config`, `loaders` | `DialexSource` | Lo que lee el proveedor                                                         |
| `children`                          | `ReactNode`    | El componente bajo prueba                                                       |

```tsx
import { dialex } from "../dialex.generated";

render(
  <TestDialexProvider {...dialex} locale="tr">
    <Header />
  </TestDialexProvider>,
);
```

## `dialexjs/testing/vue`

### `createTestDialex(locale?, source?)`

```ts
function createTestDialex(locale?: string, source?: DialexSource): VuePlugin;
```

Un plugin de Vue para pruebas de componentes que arranca en `locale` sin persistencia. Pasa el export `dialex` generado, o tus propios `dictionaries`, como `source`.

```ts
import { dialex } from "../dialex.generated";

mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
```
