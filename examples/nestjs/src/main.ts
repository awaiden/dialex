import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 3003;
  await app.listen(port);
  console.log(`[NestJS] Server running at http://localhost:${port}`);
}

void bootstrap();
