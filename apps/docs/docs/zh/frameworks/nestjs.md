# NestJS

## 模块

```ts
import { Module } from "@nestjs/common";
import { DialexModule } from "dialexjs/nestjs";

import { dialex } from "./dialex.generated.js";

@Module({
  imports: [DialexModule.forRoot({ ...dialex })],
  controllers: [AppController],
})
export class AppModule {}
```

`forRoot` 还接受 `isGlobal`（默认 `true`）。异步配置：

```ts
DialexModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    ...dialex,
    defaultLocale: config.get("DEFAULT_LOCALE"),
  }),
});
```

## 控制器

```ts
import { Controller, Get } from "@nestjs/common";
import { DialexLocale, DialexDictionary } from "dialexjs/nestjs";

@Controller()
export class AppController {
  @Get(":locale")
  getHome(@DialexLocale() locale: string, @DialexDictionary("home") dict: any) {
    return { title: dict.title, locale };
  }
}
```

## 导出

| 导出                                    | 说明                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DialexModule.forRoot / forRootAsync`   | 动态模块注册                                                                                        |
| `DialexService`                         | `resolveLocale(req)`、`getDictionary(name, locale?)`、`getDefaultLocale()`、`getSupportedLocales()` |
| `DialexInterceptor`、`DialexMiddleware` | 附加 `req.locale` 和 `req.getDictionary`                                                            |
| `@DialexLocale()`                       | 用于已解析 locale 的参数装饰器                                                                      |
| `@DialexDictionary(name)`               | 用于词典的参数装饰器                                                                                |
| `DIALEX_OPTIONS`                        | 模块选项的注入令牌                                                                                  |

`DialexLocale` 和 `DialexDictionary` 读取拦截器或中间件附加到请求上的内容，因此请确保应用了其中之一。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。
