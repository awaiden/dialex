# NestJS

## 模块

```ts
import { Module } from "@nestjs/common";
import { I18nModule } from "dialexjs/nestjs";
import dictionaries from "./i18n.generated.js";

@Module({
  imports: [I18nModule.forRoot({ dictionaries, defaultLocale: "en", locales: ["en", "tr"] })],
  controllers: [AppController],
})
export class AppModule {}
```

`forRoot` 还接受 `isGlobal`（默认 `true`）。异步配置：

```ts
I18nModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    dictionaries,
    defaultLocale: config.get("DEFAULT_LOCALE"),
  }),
});
```

## 控制器

```ts
import { Controller, Get } from "@nestjs/common";
import { I18nLocale, I18nDictionary } from "dialexjs/nestjs";

@Controller()
export class AppController {
  @Get(":locale")
  getHome(@I18nLocale() locale: string, @I18nDictionary("home") dict: any) {
    return { title: dict.title, locale };
  }
}
```

## 导出

| 导出                                | 说明                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `I18nModule.forRoot / forRootAsync` | 动态模块注册                                                                                        |
| `I18nService`                       | `resolveLocale(req)`、`getDictionary(name, locale?)`、`getDefaultLocale()`、`getSupportedLocales()` |
| `I18nInterceptor`、`I18nMiddleware` | 附加 `req.locale` 和 `req.getDictionary`                                                            |
| `@I18nLocale()`                     | 用于已解析 locale 的参数装饰器                                                                      |
| `@I18nDictionary(name)`             | 用于词典的参数装饰器                                                                                |
| `I18N_OPTIONS`                      | 模块选项的注入令牌                                                                                  |

`I18nLocale` 和 `I18nDictionary` 读取拦截器或中间件附加到请求上的内容，因此请确保应用了其中之一。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。
