import { Module, type DynamicModule, type Provider } from "@nestjs/common";

import { DialexInterceptor } from "./interceptor.js";
import { DialexMiddleware } from "./middleware.js";
import { DIALEX_OPTIONS, type NestDialexAsyncOptions, type NestDialexOptions } from "./options.js";
import { DialexService } from "./service.js";

/**
 * NestJS dynamic module for dialex i18n.
 */
@Module({})
export class DialexModule {
  static forRoot(options: NestDialexOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: DIALEX_OPTIONS,
        useValue: options,
      },
      DialexService,
      DialexInterceptor,
      DialexMiddleware,
    ];

    return {
      module: DialexModule,
      global: options.isGlobal ?? true,
      providers,
      exports: [DialexService, DialexInterceptor, DialexMiddleware],
    };
  }

  static forRootAsync(asyncOptions: NestDialexAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: DIALEX_OPTIONS,
        useFactory: asyncOptions.useFactory || (() => ({})),
        inject: asyncOptions.inject || [],
      },
      DialexService,
      DialexInterceptor,
      DialexMiddleware,
    ];

    return {
      module: DialexModule,
      global: asyncOptions.isGlobal ?? true,
      imports: asyncOptions.imports || [],
      providers,
      exports: [DialexService, DialexInterceptor, DialexMiddleware],
    };
  }
}
