# Başlarken

Dialex, TypeScript ile tanımlanan sözlükler etrafında kurulmuş bir i18n çerçevesidir. Bir derleme adımı bu sözlükleri statik bir kayıt defterine ve tip bildirimlerine dönüştürür; böylece çalışma zamanındaki aramalar sıradan nesne erişiminden ibaret kalır.

## Paketler

| Paket           | Amaç                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------- |
| `dialexjs`      | Çekirdek çalışma zamanı, çerçeve adaptörleri, Vite eklentisi                             |
| `@dialexjs/cli` | İskele oluşturma, kod üretimi ve tutarlılık denetimleri için `dialexjs` / `dx` komutları |

## Kurulum

```bash
# bun
bun add dialexjs
bun add -d @dialexjs/cli

# npm
npm install dialexjs
npm install -D @dialexjs/cli

# pnpm
pnpm add dialexjs
pnpm add -D @dialexjs/cli
```

## İskele oluşturma

```bash
dialex init
```

Ya da etkileşimsiz olarak:

```bash
dialex init --framework fastify --default-locale en --locales en,tr -y
```

Bu komut `dialex.config.ts` dosyasını, başlangıç sözlüğü olan `src/home.content.ts` dosyasını oluşturur ve `package.json` dosyanıza bir `i18n:generate` betiği (`dialex generate`) ekler. Bkz. [`dialex init`](../cli/init.md).

## Sözlük tanımlama

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Dialex!",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex'e Hoş Geldiniz!",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
```

## Derleme

```bash
dialex generate
```

`src/i18n.generated.ts` (sözlük kayıt defteri) ve `src/dialex-env.d.ts` (tip genişletmesi) dosyalarını üretir. Ardından [çerçevenizi](../frameworks/README.md) seçin.
