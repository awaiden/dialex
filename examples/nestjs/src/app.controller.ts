import { Controller, Get, Param } from "@nestjs/common";
import { DialexLocale, DialexDictionary, DialexService } from "dialexjs/nestjs";

@Controller()
export class AppController {
  constructor(private readonly dialexService: DialexService) {}

  @Get()
  getHome(@DialexLocale() locale: string, @DialexDictionary("home") dict: any) {
    return {
      locale,
      title: dict.title,
      description: dict.description,
    };
  }

  @Get("greet/:name")
  getGreeting(
    @Param("name") name: string,
    @DialexLocale() locale: string,
    @DialexDictionary("home") dict: any,
  ) {
    return {
      locale,
      message: dict.greeting(name || "Guest"),
    };
  }

  @Get("locales")
  getLocales() {
    return {
      defaultLocale: this.dialexService.getDefaultLocale(),
      supportedLocales: this.dialexService.getSupportedLocales(),
    };
  }
}
