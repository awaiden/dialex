# Frameworks de cliente

Los adaptadores para frameworks de interfaz: un proveedor (o plugin) que guarda el locale activo, y hooks o stores que leen diccionarios y `t`. Las guías con ejemplos completos están en las [páginas de frameworks](../frameworks/README.md).

## Opciones comunes

La mayoría de los proveedores aceptan el objeto `dialex` generado (`dictionaries`, `config`, `loaders`: `{ ...dialex }`) y estas opciones:

| Opción           | Tipo                                  | Por defecto                    | Descripción                                                                                                                                          |
| ---------------- | ------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale`  | `string`                              | la configuración, luego `"en"` | Locale usado cuando nada más decide                                                                                                                  |
| `initialLocale`  | `string`                              | —                              | El locale con el que renderizar primero, por ejemplo el que resolvió el servidor. Si se define, no se aplica el locale recordado                     |
| `persist`        | `"cookie" \| "localStorage" \| false` | `"cookie"`                     | Dónde se recuerda la elección. Se aplica tras el montaje, de modo que el marcado renderizado en el servidor y el primer render del cliente coinciden |
| `storageKey`     | `string`                              | `"locale"`                     | Clave de la cookie o de `localStorage`                                                                                                               |
| `onLocaleChange` | `(locale: string) => void`            | —                              | Se llama después de que cambia el locale                                                                                                             |

Los hooks y stores devuelven el diccionario del locale activo siguiendo la [cadena de fallback](../guide/fallbacks.md). Con carga `lazy`, nombra los diccionarios que leerá un `t` (`useT("home", "nav")`) para que se carguen; el componente se actualiza cuando llegan.

## React

`dialexjs/react`

| Export                | Firma                                          | Descripción                                                                                               |
| --------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | `(props: DialexProviderProps) => ReactElement` | Proporciona locale, `setLocale` y diccionarios. Props: las opciones comunes, `children` y `{ ...dialex }` |
| `useDialex`           | `() => { locale, setLocale, store }`           | El contexto. Lanza fuera de un proveedor                                                                  |
| `useDialexConfig`     | `() => DialexClientConfig`                     | La configuración generada, para `locales` o `prefixDefault`                                               |
| `useDictionary`       | `<K>(name: K) => ResolveDictionaryType<K>`     | El diccionario del locale activo. Con `lazy` suspende hasta cargarse: usa `<Suspense>`                    |
| `useT`                | `(...dictionaryNames: string[]) => Translate`  | Un `t` ligado al locale activo                                                                            |
| `preloadDictionaries` | consulta [más abajo](#preloaddictionaries)     | Empieza a cargar diccionarios diferidos                                                                   |

## Preact

`dialexjs/preact` tiene los mismos exports que React (`DialexProvider`, `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries`) con props `ComponentChildren`. Con `lazy` el diccionario es un objeto vacío hasta que se ha cargado, y el componente se vuelve a renderizar cuando llega; no suspende. Funciona sin `preact/compat`.

## Solid

`dialexjs/solid`

| Export                | Descripción                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | Props: las opciones comunes, `children` y `{ ...dialex }`                                                                                         |
| `useDialex()`         | `{ locale, setLocale, store, loaded, ensureLoaded }`. `locale` es un accessor: léelo como `locale()`                                              |
| `useDictionary(name)` | Un accessor: `const home = useDictionary("home")`, luego `home().title`. Se actualiza al cambiar el locale y cuando carga un diccionario diferido |
| `useT(...names)`      | Un `t` que sigue el locale actual. Llámalo en JSX o en un efecto para que el resultado sea reactivo                                               |
| `preloadDictionaries` | Consulta [más abajo](#preloaddictionaries)                                                                                                        |

## Vue

`dialexjs/vue`

| Export                | Firma                                                       | Descripción                                                                              |
| --------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `createDialex`        | `(options?: CreateDialexOptions) => Plugin & DialexContext` | El plugin. Opciones: `{ ...dialex }`, `defaultLocale`, `onLocaleChange`                  |
| `useDialex`           | `() => { locale: Ref<string>, setLocale, store }`           | El contexto. Lanza cuando el plugin no está instalado                                    |
| `useDictionary`       | `<K>(name: K) => ComputedRef<ResolveDictionaryType<K>>`     | El diccionario como ref computada. Con `lazy` está vacío hasta cargarse, y SSR lo espera |
| `useT`                | `(...dictionaryNames: string[]) => Translate`               | Un `t` que sigue el locale. Léelo en una plantilla o en un `computed`                    |
| `DIALEX_KEY`          | `InjectionKey<DialexContext>`                               | La clave de inyección del contexto                                                       |
| `preloadDictionaries` | Consulta [más abajo](#preloaddictionaries)                  | Empieza a cargar diccionarios diferidos                                                  |

## Nuxt

`dialexjs/nuxt` es un módulo de Nuxt: `modules: ["dialexjs/nuxt"]`. Instala el plugin de Vue con un locale respaldado por cookie desde `dialex.generated.ts` y autoimporta `useDialex` y `useDictionary`. Las opciones van bajo la clave `dialex` de `nuxt.config.ts`:

| Opción       | Tipo     | Por defecto | Descripción                                                                                                        |
| ------------ | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `cookieName` | `string` | `"locale"`  | Cookie que recuerda el locale                                                                                      |
| `generated`  | `string` | encontrado  | Ruta del archivo generado, sin extensión. Se busca en el directorio de código, en la raíz del proyecto o en `src/` |

También acepta los campos de `DialexConfig`. Ejecuta primero `dialex generate`: el módulo lee el archivo que escribe.

## Svelte

`dialexjs/svelte`

| Export                                  | Descripción                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `provideDialex(source?, options?)`      | Llámalo una vez en el componente raíz con `{ ...dialex }`. Devuelve `DialexSvelte`     |
| `useDialex()`                           | `{ locale, setLocale, store, dictionary, translator }` del `provideDialex` más cercano |
| `useDictionary(name)`                   | Un store: `const home = useDictionary("home")`, luego `$home.title`                    |
| `useT(...names)`                        | Un store de `t`: `const t = useT("home")`, luego `$t("home.title")`                    |
| `createSvelteDialex(source?, options?)` | El núcleo reactivo sin contexto de componente, para módulos simples y pruebas          |
| `preloadDictionaries`                   | Consulta [más abajo](#preloaddictionaries)                                             |

`options` son las opciones comunes (`defaultLocale`, `initialLocale`, `persist`, `storageKey`, `onLocaleChange`).

## Qwik

`dialexjs/qwik`

```ts
function createDialexQwik(options?: CreateDialexQwikOptions): {
  useDialexProvider(options?: { initialLocale?: string }): DialexState;
  useDialex(): DialexState;
  setLocale(state: DialexState, locale: string): void;
  useDictionary<K>(name: K): () => ResolveDictionaryType<K>;
  useT(): Translate;
  getPersistedLocale(): string | undefined;
};
```

Llama a `createDialexQwik({ ...dialex })` una vez en un módulo propio e importa los hooks desde allí; los diccionarios quedan fuera de la página serializada. `DialexState` es `{ locale: string; loaded: number }`, datos simples que Qwik puede reanudar. `persist` y `storageKey` son las opciones comunes; leer de vuelta el locale guardado corresponde al servidor (`getPersistedLocale`).

## Lit

`dialexjs/lit`

| Export                   | Descripción                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options?)` | Crea el estado del locale: `{ locale, config, store, setLocale, subscribe, getDictionary, t }`. Créalo una vez, en un módulo propio                                 |
| `DialexController`       | Un controlador reactivo para cualquier `ReactiveControllerHost`: `new DialexController(this, i18n)`. Tiene `locale`, `setLocale`, `dictionary(name)`, `t(...names)` |
| `preloadDictionaries`    | Consulta [más abajo](#preloaddictionaries)                                                                                                                          |

## `dialexjs/react-native`

| Export                                                                         | Descripción                                                                                        |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `DialexProvider`                                                               | Proveedor para React Native y Expo. Consulta las props más abajo                                   |
| `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries` | Los hooks de `dialexjs/react`                                                                      |
| `LocaleStorage`                                                                | `{ getItem(key), setItem(key, value) }`, síncrono o asíncrono: AsyncStorage, MMKV o `localStorage` |

| Prop                                               | Tipo                 | Descripción                                                                                                           |
| -------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `deviceLocales`                                    | `string \| string[]` | Los idiomas del dispositivo, el preferido primero (`getLocales()` de `expo-localization`). Se usa el primero admitido |
| `initialLocale`                                    | `string`             | Prevalece sobre `deviceLocales` y sobre el locale guardado                                                            |
| `storage`                                          | `LocaleStorage`      | Dónde se recuerda la elección. Los hijos se renderizan una vez que se ha leído                                        |
| `storageKey`                                       | `string`             | Clave de almacenamiento. Por defecto `"locale"`                                                                       |
| `defaultLocale`, `onLocaleChange`, `{ ...dialex }` | —                    | Igual que en las opciones comunes                                                                                     |

## Angular

`dialexjs/angular`

| Export                     | Descripción                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provideDialex(options)`   | Proveedores de entorno. `AngularDialexOptions`: `dictionaries` (obligatorio), `config`, `defaultLocale`, `locales`, `fallbacks`, `initialLocale` (una cadena, o una función que se ejecuta en el contexto de inyección), `persist`, `storageKey` |
| `injectDialex()`           | El `DialexStore`: `locale` (una signal), `setLocale`, `dictionary(name)`, `t`                                                                                                                                                                    |
| `injectDictionary(name)`   | El diccionario como signal                                                                                                                                                                                                                       |
| `injectT()`                | La función `t`; lee la signal del locale en cada llamada, así que una plantilla que la usa se mantiene al día                                                                                                                                    |
| `DIALEX`, `DIALEX_OPTIONS` | Los tokens de inyección del store y de las opciones                                                                                                                                                                                              |

Llama a las funciones `inject*` en un contexto de inyección.

## Next.js

| Export                                                         | Descripción                                                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `createDialexMiddleware(options)` (`dialexjs/next/middleware`) | Mantiene cada página bajo un prefijo de locale. Devuelve `(request: NextRequest) => NextResponse`                            |
| `DialexLink` (`dialexjs/next/link`)                            | `next/link` que mantiene el locale en la URL. Necesita `DialexProvider` por encima. Props: las de `next/link`, más `locale?` |

Opciones de `createDialexMiddleware`: las [opciones de enrutamiento](./routing.md) (`locales` obligatorio, `defaultLocale`, `prefixDefault`), las opciones de detección `queryKeys`, `cookieKeys`, `headerKey`, `custom`, `fallbacks`, y:

| Opción       | Tipo                            | Por defecto                              | Descripción                                                       |
| ------------ | ------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `cookieName` | `string`                        | `"locale"`                               | Cookie que recuerda el locale del visitante                       |
| `setCookie`  | `boolean`                       | `true`                                   | Escribe la cookie cuando el locale de la URL difiere del guardado |
| `ignore`     | `(pathname: string) => boolean` | `/_next`, `/api`, extensiones de archivo | Rutas que omiten el tratamiento de locale                         |

## `preloadDictionaries`

```ts
function preloadDictionaries(
  source: DialexSource,
  ...rest: (string | { locale?: string })[]
): Promise<void>;
```

Empieza a cargar diccionarios diferidos; no hace nada cuando no son diferidos. En modo `lazy: "locale"` carga el locale por defecto salvo que pases `{ locale }` primero.

```ts
await preloadDictionaries(dialex, { locale: "tr" }, "checkout", "cart");
```
