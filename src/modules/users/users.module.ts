import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './controllers/users.controllers';
import { UsersService } from './services/users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * UsersModule
 *
 * Módulo encargado de la gestión de usuarios.
 * Incluye el controlador y el servicio para operaciones CRUD y autenticación de usuarios.
 */
@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
