import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const corsOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:4200').split(',');
  app.enableCors({ origin: corsOrigins });
  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();