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

import cookieParser from 'cookie-parser';

/**
 * Inicializa la aplicación NestJS y configura los filtros globales, pipes y Swagger.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 2. Activar el middleware para leer cookies que llegan
  app.use(cookieParser());

  // 3. Configurar CORS (Crucial para Cookies)
  app.enableCors({
    // IMPORTANTE: Cuando usas cookies, NO puedes poner '*' aquí.
    // Debes poner explícitamente la URL de tu frontend.
    origin: ENVIROMENTS.FRONTEND_URL,

    // IMPORTANTE: Esto permite el intercambio de cookies entre Front y Back
    credentials: true,

    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  const version = 'v1';
  app.setGlobalPrefix(`api/${version}`);

  // Swagger setup
  const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Documentación de la API de Miyoru')
    .setVersion(version)
    // .addCookieAuth('accessToken')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`api/${version}/docs`, app, document);

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
  console.log(
    `Application is running on: ${await app.getUrl()}/api/${version}`,
  );
  console.log(
    `Application docs is running on: ${await app.getUrl()}/api/${version}/docs `,
  );
}
bootstrap();
