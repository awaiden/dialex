# Gereksinimler

Dialex'in ortamınızdan neye ihtiyaç duyduğu ve sizden neyi kendiniz kurmanızı istediği.

## Çalışma zamanı ve araçlar

| Gereksinim              | Dialex'in ihtiyaç duyduğu                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modül biçimi            | Paketler **yalnızca ES modülüdür** (`"type": "module"`, `.mjs` dosyaları). ESM'den, bir bundler'dan ya da CommonJS'te `import()` ile içe aktarın                                                               |
| Node.js                 | `engines` alanı bildirilmemiştir. Test paketi ve CI Node.js 22'de çalışır; deponun kendi araçları 22.18 ya da üstünü ister. Güncel bir LTS sürümü kullanın                                                     |
| Diğer çalışma zamanları | Çalışma zamanı çekirdeği ve Fetch API işleyicisi yalnızca standart API'leri (`Intl`, `Request`, `Headers`, `Map`) kullanır; bunların bulunduğu her yerde çalışır: Bun, Deno, Cloudflare Workers ve tarayıcılar |
| TypeScript              | Güncel bir 5.x ya da sonrası. Tipler şablon sabit ve koşullu tipler kullanır. Depo tipleri TypeScript 7 ile denetler                                                                                           |
| Modül çözümleme         | `compilerOptions.moduleResolution` değeri `"bundler"`, `"node16"` ya da `"nodenext"` olmalıdır. Alt yol içe aktarımları (`dialexjs/react`) `exports` girdileridir; eski `"node"` ayarı bunları okumaz          |
| Paket yöneticisi        | npm, Yarn, pnpm ve Bun çalışır.                                                                                                                                                                                |

## Paketler

| Paket                       | Nedir                                                | Bağımlılıklar                                         |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `dialexjs`                  | Çalışma zamanı ve her framework adaptörü             | Yok. Framework'ler isteğe bağlı peer bağımlılıklardır |
| `@dialexjs/cli`             | `dialex` / `dx`. Geliştirme bağımlılığı olarak kurun | Kendi araçlarını kurar; `dialexjs` gerekir            |
| `@dialexjs/language-server` | Zed ve diğer editörler için LSP sunucusu             | `@dialexjs/cli`                                       |
| `@dialexjs/mcp`             | Yapay zekâ asistanları için MCP sunucusu             | `@dialexjs/cli`                                       |

## Framework sürümleri

Framework'ler `dialexjs`'in **isteğe bağlı peer bağımlılıklarıdır**: yalnızca kullandıklarınızı kurun. Adaptörlerin bildirdiği sürümler şunlardır:

| Adaptör                                                 | Peer bağımlılık                  | Aralık                |
| ------------------------------------------------------- | -------------------------------- | --------------------- |
| `dialexjs/react`, `react-native`, `next/*` (`next` ile) | `react`                          | `>=19.0.0`            |
| `dialexjs/next/middleware`, `next/link`                 | `next`                           | `>=13.0.0`            |
| `dialexjs/preact`                                       | `preact`                         | `>=10.0.0`            |
| `dialexjs/solid`                                        | `solid-js`                       | `^1.8.0`              |
| `dialexjs/vue`                                          | `vue`                            | `^3.4.0`              |
| `dialexjs/nuxt`                                         | `@nuxt/kit`                      | `>=3.0.0`             |
| `dialexjs/svelte`                                       | `svelte`                         | `^4.0.0 \|\| ^5.0.0`  |
| `dialexjs/qwik`                                         | `@builder.io/qwik`               | `>=1.5.0 <2`          |
| `dialexjs/lit`                                          | `lit`                            | `^3.0.0`              |
| `dialexjs/angular`                                      | `@angular/core`, `rxjs`          | `>=17.0.0`, `>=7.0.0` |
| `dialexjs/express`                                      | `express`                        | `>=4.0.0`             |
| `dialexjs/fastify`                                      | `fastify`                        | `>=4.0.0`             |
| `dialexjs/koa`                                          | `koa`                            | `>=2.0.0`             |
| `dialexjs/hono`                                         | `hono`                           | `>=3.0.0`             |
| `dialexjs/elysia`                                       | `elysia`                         | `>=1.0.0`             |
| `dialexjs/nestjs`                                       | `@nestjs/common`, `@nestjs/core` | `>=10.0.0`            |
| `dialexjs/hapi`                                         | `@hapi/hapi`                     | `>=21.0.0`            |
| `dialexjs/adonis`                                       | `@adonisjs/http-server`          | `>=7.0.0`             |
| `dialexjs/h3`                                           | `h3`                             | `>=1.8.0 <2`          |
| `dialexjs/astro`                                        | `astro`                          | `>=4.0.0`             |

`dialexjs/sveltekit`, `dialexjs/trpc`, `dialexjs/web`, `dialexjs/routing`, `dialexjs/icu`, `dialexjs/server` ve `dialexjs/testing` bir framework paketi gerektirmez: yapısal tipler ya da standart `Request`'ler kullanırlar. React Native `react` kullanır; Expo'nun `expo-localization` ve AsyncStorage'ı sizin verdiğiniz şeylerdir, peer bağımlılık değildir.

## Editörler

| Editör         | İhtiyacınız olan                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| VS Code        | Dialex eklentisi (her GitHub sürümüne eklenmiş bir `.vsix`). Bkz. [VS Code](./vscode.md)                             |
| Zed            | Dialex eklentisi; Node.js gerektiren `@dialexjs/language-server`'ı başlatır. Bkz. [Zed ve diğer editörler](./zed.md) |
| LSP'li her şey | `--stdio` ile başlatılan `@dialexjs/language-server`                                                                 |

## Kurulumunuzu denetleyin

```bash
node --version            # a current LTS
npx dialex --version      # the CLI, once installed
npx dialex check          # parity, ICU, references and a stale generated file
```
