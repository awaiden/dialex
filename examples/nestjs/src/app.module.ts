import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { DialexModule, DialexInterceptor } from "dialexjs/nestjs";

import { AppController } from "./app.controller.js";
import { dialex } from "./dialex.generated.js";

@Module({
  imports: [DialexModule.forRoot({ ...dialex })],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: DialexInterceptor,
    },
  ],
})
export class AppModule {}
