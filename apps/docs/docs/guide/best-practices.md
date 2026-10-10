# Best practices

These recommendations apply to every framework. Each one comes from how Dialex works: the dictionaries are compiled into `dialex.generated.ts`, the locale is resolved once per request or per app, and the types come from your dictionaries.

## Organize dictionaries

- Keep one dictionary per feature or page, next to the code that uses it (`checkout.content.ts` beside the checkout page). Small files are easy to review, to translate and to load lazily.
- Put text that is shared across the app in a `common` dictionary and keep everything else out of it, so it does not grow into a catch-all.
- Give every dictionary the same locales. `dx check` reports the keys and locales that are missing, and the editor extensions show them as you type.

## Name keys by meaning

A key says what the text is for, not what it currently says. When the wording changes, the key and every call site stay the same.

```ts
// Good: the key describes the role
defineDictionary("checkout", {
  en: { payButton: "Pay now", emptyCart: "Your cart is empty" },
  tr: { payButton: "Şimdi öde", emptyCart: "Sepetiniz boş" },
});

// Avoid: the key repeats the English text, and breaks when the text changes
defineDictionary("checkout", {
  en: { payNow: "Pay now", yourCartIsEmpty: "Your cart is empty" },
});
```

Group related keys under an object (`nav.about`, `nav.contact`) and keep the nesting shallow, two or three levels. Deeper trees are hard to read in `t("...")` calls.

## Write messages translators can finish

- Use [ICU messages](./icu.md) for plurals, selects and numbers: `{count, plural, one {# item} other {# items}}`. Never build a sentence from pieces (`"You have " + n + " items"`), because word order and plural forms differ between languages.
- Prefer ICU strings to function values for text that goes to translators. Functions are fine for logic that only developers touch, but translation tools and `dx check` can validate an ICU string and cannot look inside a function.
- Keep placeholders the same in every locale. `dx check` reports a locale whose arguments differ from the others.

```ts
defineDictionary("cart", {
  en: { items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}" },
  tr: { items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}" },
});

t("cart.items", { count: 3 }); // "3 items"; `count` is checked at compile time
```

## Keep the generated file current

- Commit `dialex.generated.ts` and `dialex-env.d.ts`. The app imports them, and a fresh checkout should build without a generate step.
- While developing, keep it fresh with `dx generate --watch`, or use the VS Code or Zed extension, which regenerate it for you when a dictionary changes.
- In CI, run `dx check --fail-on-stale`. It fails when the committed generated file no longer matches the dictionaries, when keys or locales are missing, and when translations are out of date.

```yaml
# .github/workflows/ci.yml
- run: bun install --frozen-lockfile
- run: bunx dx check --fail-on-stale
```

## Resolve the locale in one place

- Decide the locale once per request (on the server) or once per app (in the browser), and pass it down. Do not read cookies or `navigator.language` in individual components.
- With server rendering, give the client the locale the server used (`initialLocale`) so the first client render matches the HTML. Otherwise the page flashes the wrong language or hydration reports a mismatch.
- Set `<html lang>` to the active locale. The React, Svelte and Solid providers do it for you; on the server, write it into the HTML you render.
- Remember the visitor's choice in the `locale` cookie, which the server adapters read, rather than in `localStorage`, which the server cannot see.

## Load only what a page needs

- Small apps do not need lazy loading: all dictionaries in one bundle is simplest and fastest. Turn it on when the dictionaries are a noticeable part of the bundle.
- With `lazy: "locale"`, a visitor downloads only the dictionaries of the page they open, in the language they use. See [Lazy Loading](./lazy-loading.md).
- Preload what the next navigation needs (`preloadDictionaries(dialex, "checkout")`) so the page does not wait for a download.

## Translate with a review step

- `dx translate` fills missing keys with `[TODO]` placeholders or machine translations. Treat its output like any other change: review the diff before merging.
- Commit `dialex.lock.json`. It records which source text each translation was made from, so `dx check` and `dx translate --stale` can tell when English changed and the translation did not.
- Search for `[TODO]` before a release. `dx check` reports every placeholder that is still there.

## Test with the real dictionaries

- Render components with the same `dialex` export the app uses, and assert on the text of one locale. [Testing](./testing.md) has wrappers for React and Vue.
- Test at least the default locale and one other, so a missing key or a plural form shows up in the test run and not in production.

## Work with your editor

- Install the [VS Code extension](./vscode.md), or [Zed and other editors](./zed.md) through the language server. You get diagnostics, hover, go to definition, completion and quick fixes for keys.
- Store a dictionary in a variable (`const home = useDictionary("home")`) and the editor still resolves `home.title`.
- Keep generated and build output out of the scan: Dialex already respects `.gitignore`, and `exclude` in `dialex.config.ts` covers the rest.

## Checklist

| Before you ship                          | Command or setting                         |
| ---------------------------------------- | ------------------------------------------ |
| Dictionaries and generated file agree    | `dx check --fail-on-stale`                 |
| No missing keys or locales               | `dx check`                                 |
| No leftover placeholders                 | `[TODO]`                                   |
| Translations match the source text       | `dx translate --stale`, `dialex.lock.json` |
| `<html lang>` follows the locale         | provider or server markup                  |
| Bundle contains only needed dictionaries | `lazy: "locale"`                           |
