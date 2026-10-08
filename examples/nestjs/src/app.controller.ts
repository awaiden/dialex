import { Controller, Get, Param } from "@nestjs/common";
import { I18nLocale, I18nDictionary, I18nService } from "dialexjs/nestjs";

@Controller()
export class AppController {
  constructor(private readonly i18nService: I18nService) {}

  @Get()
  getHome(@I18nLocale() locale: string, @I18nDictionary("home") dict: any) {
    return {
      locale,
      title: dict.title,
      description: dict.description,
    };
  }

  @Get("greet/:name")
  getGreeting(
    @Param("name") name: string,
    @I18nLocale() locale: string,
    @I18nDictionary("home") dict: any,
  ) {
    return {
      locale,
      message: dict.greeting(name || "Guest"),
    };
  }

  @Get("locales")
  getLocales() {
    return {
      defaultLocale: this.i18nService.getDefaultLocale(),
      supportedLocales: this.i18nService.getSupportedLocales(),
    };
  }
}
