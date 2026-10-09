# dialex init

Dialex'i geçerli projede başlatır.

- Çerçeveyi algılar (Next.js, Fastify, Koa, Hono, Express, NestJS, Elysia, SvelteKit, Astro, Vue, Nuxt, React/Vite).
- Magicast AST dönüşümlerini kullanarak `dialex.config.ts` dosyasını düzenler, React ve Vue projelerinde `vite.config.ts` içine `i18nPlugin()` ekler ve Nuxt projelerinde `nuxt.config.ts` içine `dialexjs/nuxt` modülünü kaydeder.
- Başlangıç sözlüğünü ve TypeScript bildirim dosyasını yazar.
- `dialexjs` paketini ve `@dialexjs/cli` geliştirme bağımlılığını `package.json` dosyasına ekler (zaten listelenen paketlere dokunmaz) ve bir `dx:generate` betiği ekler. Ardından paket yöneticinizin install komutunu çalıştırın.

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| Seçenek                         | Açıklama                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`, `express`, `fastify`, `koa`, `nestjs`, `elysia`, `sveltekit`, `astro`, `vue`, `nuxt`, `next` veya `react` |
| `-d, --default-locale <locale>` | Varsayılan yerel ayar, örn. `en`                                                                                  |
| `-l, --locales <locales>`       | Virgülle ayrılmış yerel ayarlar, örn. `en,tr`                                                                     |
| `-y, --yes`                     | Soruları atlar ve varsayılanları kullanır                                                                         |
