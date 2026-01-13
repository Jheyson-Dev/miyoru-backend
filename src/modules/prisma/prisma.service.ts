import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENVIROMENTS } from 'src/config';
import { PrismaClient } from 'src/generated/prisma/client';

/**
 * PrismaService
 *
 * Servicio que extiende PrismaClient y gestiona la conexión a la base de datos usando Prisma ORM.
 * Se conecta automáticamente al iniciar el módulo y se desconecta al destruirlo.
 *
 * Permite inyectar PrismaClient en cualquier provider de NestJS.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Inicializa PrismaService con el adaptador de conexión PostgreSQL.
   */
  constructor() {
    const pool = new PrismaPg({
      connectionString: ENVIROMENTS.DATABASE_URL,
    });
    super({ adapter: pool });
  }

  /**
   * Conecta el cliente Prisma al iniciar el módulo.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Desconecta el cliente Prisma al destruir el módulo.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
