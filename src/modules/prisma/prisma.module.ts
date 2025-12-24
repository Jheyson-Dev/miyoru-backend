import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule
 *
 * Módulo global que provee el servicio PrismaService para acceso a la base de datos usando Prisma ORM.
 *
 * Este módulo debe importarse una sola vez en AppModule y permite inyectar PrismaService en cualquier parte del proyecto.
 */
@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
