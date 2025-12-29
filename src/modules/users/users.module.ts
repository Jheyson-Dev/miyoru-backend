import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controllers';
import { UsersService } from './services/users.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * UsersModule
 *
 * Módulo encargado de la gestión de usuarios.
 * Incluye el controlador y el servicio para operaciones CRUD y autenticación de usuarios.
 */
@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
