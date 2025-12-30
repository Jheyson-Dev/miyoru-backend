import { NestFactory } from '@nestjs/core';
/**
 * Punto de entrada principal de la aplicación NestJS.
 * Configura los filtros globales, pipes y la documentación Swagger.
 *
 * @module Main
 */
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './shared/filters/prisma-exception.filter';
import { ValidationExceptionFilter } from './shared/filters/validation-exception.filter';
import { HttpExceptionFilter } from './shared/filters/http-exception-format.filter';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ENVIROMENTS } from './config';

/**
 * Inicializa la aplicación NestJS y configura los filtros globales, pipes y Swagger.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger setup
  const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Documentación de la API de Miyoru')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // ValidationPipe global
  const { ValidationPipe } = await import('@nestjs/common');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Prisma Exception Filter
  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new HttpExceptionFilter(),
    new ValidationExceptionFilter(),
    new GlobalExceptionFilter(),
  );
  await app.listen(ENVIROMENTS.PORT);
}
bootstrap();
