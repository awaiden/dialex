import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { I18nModule, I18nInterceptor } from "dialexjs/nestjs";
import { AppController } from "./app.controller.js";
import dictionaries from "./i18n.generated.js";

@Module({
  imports: [
    I18nModule.forRoot({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries,
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: I18nInterceptor,
    },
  ],
})
export class AppModule {}
