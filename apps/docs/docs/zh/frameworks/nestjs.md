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

## 最佳实践

- 在根模块中导入一次 `DialexModule.forRoot({ ...dialex })`。它默认是全局的，因此功能模块无需再次导入。
- 用 `@DialexLocale()` 和 `@DialexDictionary("home")` 以参数形式获取 locale 和词典，而不是读取 `req`，这样控制器更容易测试。
- 为整个应用用 `APP_INTERCEPTOR` 注册 `DialexInterceptor`；如果需要在守卫运行之前就拿到 locale，则在 `configure()` 中应用 `DialexMiddleware`。

## 故障排除

- **`Nest can't resolve dependencies of ... (DialexService)`**：模块图中没有导入 `DialexModule.forRoot(...)`，或者关闭了 `isGlobal`。
- **`req.getDictionary` 是 undefined**：既没有注册 `DialexInterceptor`，也没有注册 `DialexMiddleware`。装饰器和 `DialexService` 不依赖它们，但请求属性依赖。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
