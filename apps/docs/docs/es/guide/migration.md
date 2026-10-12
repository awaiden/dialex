# Migrar a Dialex

Cómo pasar desde i18next, react-intl (FormatJS), next-intl o vue-i18n. Las ideas se corresponden bastante; lo que cambia es dónde viven los mensajes (archivos TypeScript, no JSON) y cómo los llamas (un único `t`, con el nombre del diccionario primero).

## El plan

1. **Instala** `dialexjs` y `@dialexjs/cli`, y ejecuta `dialex init` ([Primeros pasos](./getting-started.md)).
2. **Crea un diccionario por espacio de nombres o funcionalidad**, con un objeto vacío por locale:

   ```ts
   // src/home.content.ts
   import { defineDictionary } from "dialexjs";

   export default defineDictionary("home", { en: {}, tr: {} });
   ```

3. **Aplana tu JSON** a un archivo por locale con las claves prefijadas por el nombre del diccionario y luego **impórtalo**:

   ```json
   { "home.title": "Welcome", "home.nav.about": "About" }
   ```

   ```bash
   dialex import en.json --allow-new
   dialex import tr.json --allow-new
   ```

   `--allow-new` añade claves que ningún locale tiene aún. [`dialex import`](../cli/import.md) valida los mensajes ICU y lista lo que rechazó.

4. **Convierte la sintaxis de los mensajes** (siguiente sección) en los diccionarios.
5. **Sustituye las llamadas** en tu código, un framework cada vez.
6. **Ejecuta `dialex generate` y `dialex check`.** Las claves que faltan, los argumentos que no coinciden y las llamadas a claves inexistentes aparecen de inmediato.

## Sintaxis de los mensajes

Los mensajes de Dialex son [ICU MessageFormat](./icu.md). Si tus mensajes ya son ICU, cópialos.

| Tienes                                                       | Escribe en Dialex                                                                                                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| i18next `Hello {{name}}`                                     | `Hello {name}`                                                                                                                            |
| i18next `key_one` / `key_other` con `{{count}}`              | `{count, plural, one {# item} other {# items}}`                                                                                           |
| Contexto de i18next `key_male` / `key_female`                | `{gender, select, male {...} female {...} other {...}}`                                                                                   |
| Anidamiento de i18next `$t(other.key)`                       | Sin equivalente. Repite el texto, o usa un mensaje de función que llame a `t`                                                             |
| Formato de i18next `{{val, number}}`                         | `{val, number}`; fechas `{when, date, medium}`                                                                                            |
| vue-i18n `{name}`                                            | Igual                                                                                                                                     |
| Tuberías de vue-i18n `no items \| one item \| {count} items` | `{count, plural, =0 {no items} one {one item} other {# items}}`                                                                           |
| Enlaces de vue-i18n `@:other.key`                            | Sin equivalente. Repite el texto                                                                                                          |
| Cadenas ICU de react-intl y next-intl                        | Igual, cópialas tal cual                                                                                                                  |
| Etiquetas de texto enriquecido `<b>...</b>`                  | **No admitidas**: las etiquetas no se analizan. Divide el mensaje alrededor del marcado, o escribe un mensaje de función que devuelva JSX |

## Desde i18next

| i18next                                | Dialex                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `locales/<lng>/<ns>.json`              | `src/<ns>.content.ts`: `defineDictionary("<ns>", { en: {...}, tr: {...} })`         |
| `useTranslation("home")`, `t("title")` | `useT("home")`, `t("home.title")`: el nombre del diccionario forma parte de la ruta |
| `i18n.changeLanguage("tr")`            | `setLocale("tr")` de `useDialex()`                                                  |
| `i18n.language`                        | `locale` de `useDialex()`                                                           |
| `fallbackLng`                          | `defaultLocale` y `fallbacks` en `dialex.config.ts`                                 |
| `supportedLngs`                        | `locales`                                                                           |
| Plugin detector de idioma              | Los adaptadores de servidor, o `initialLocale` y `persist` del proveedor            |
| Backends de carga diferida             | `lazy: true` o `"locale"`; consulta [Carga diferida](./lazy-loading.md)             |

```tsx
// before
const { t } = useTranslation("home");
return <p>{t("items", { count })}</p>;

// after
const t = useT("home");
return <p>{t("home.items", { count })}</p>;
```

## Desde react-intl (FormatJS)

| react-intl                                                            | Dialex                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Catálogo de mensajes `{ "home.title": "..." }`                        | Las mismas claves planas: `dialex import` las toma tal cual (`home` pasa a ser el diccionario) |
| `<IntlProvider locale messages>`                                      | `<DialexProvider {...dialex}>`                                                                 |
| `intl.formatMessage({ id }, values)`, `<FormattedMessage>`            | `t("home.title", values)`                                                                      |
| `defineMessages`, extracción de mensajes                              | No hace falta: las claves viven en el diccionario y `dialex check` encuentra las desconocidas  |
| `intl.formatNumber`, `formatDate`, `formatRelativeTime`, `formatList` | `number`, `date`, `relativeTime`, `list` de `dialexjs`, con el locale como primer argumento    |
| `intl.locale`                                                         | `locale` de `useDialex()`                                                                      |

```tsx
// before
<FormattedMessage id="home.items" values={{ count }} />;

// after
{
  t("home.items", { count });
}
```

## Desde next-intl

| next-intl                               | Dialex                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `messages/<locale>.json`                | Diccionarios `*.content.ts` (aplana el JSON y usa `dialex import`) |
| `useTranslations("home")`, `t("title")` | `useT("home")`, `t("home.title")`                                  |
| `getTranslations` en Server Components  | `getT(locale)` de `createDialexServer(dialex)`                     |
| `createMiddleware(routing)`             | `createDialexMiddleware({ locales, defaultLocale })`               |
| `Link` de `createNavigation`            | `DialexLink`                                                       |
| `t.rich(...)`                           | No admitido. Usa un mensaje de función que devuelva JSX            |
| `NextIntlClientProvider`                | `DialexProvider {...dialex}`                                       |

Consulta [Next.js](../frameworks/nextjs.md) para la configuración completa.

## Desde vue-i18n

| vue-i18n                                  | Dialex                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `createI18n({ locale, messages })`        | `createDialex({ ...dialex })` y `app.use(...)`                         |
| `useI18n()`, `t("home.title")`, `$t(...)` | `useT("home")` y `t("home.title")`                                     |
| `locale.value = "tr"`                     | `setLocale("tr")` de `useDialex()`                                     |
| `fallbackLocale`                          | `defaultLocale` y `fallbacks`                                          |
| Tuberías de mensaje para plurales         | `plural` de ICU                                                        |
| Nuxt `@nuxtjs/i18n`                       | El módulo `dialexjs/nuxt`; consulta [Vue / Nuxt](../frameworks/vue.md) |

## Lo que Dialex no tiene

Comprueba esto antes de empezar; cada punto tiene una solución alternativa arriba.

- Etiquetas de texto enriquecido en los mensajes (`<b>`, `t.rich`): usa mensajes de función que devuelvan marcado.
- Mensajes anidados o enlazados (`$t(...)`, `@:key`): repite el texto.
- Espacios de nombres como concepto aparte: un diccionario es el espacio de nombres.
- Cargar traducciones desde un servidor en ejecución: las traducciones se distribuyen con la app (consulta las [preguntas frecuentes](./faq.md)).
- Pseudolocalización y extracción automática de claves desde el código: las claves viven en diccionarios, que `dialex check` verifica contra tu código.

## Cuando termines

- [ ] `dialex check` termina con `0`
- [ ] `dialex check` se ejecuta en CI, para que los archivos generados y la paridad se mantengan al día
- [ ] Los paquetes i18n antiguos y sus archivos JSON se han eliminado
- [ ] Los editores tienen la [extensión de Dialex](./vscode.md), que da hover e ir a la definición en `t("...")`
