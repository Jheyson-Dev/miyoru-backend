import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { UserType } from 'src/generated/prisma/enums';
import {
  CreateHumanDto,
  CreateUserDto,
  UpdateHumanDto,
  UpdateUserDto,
} from 'src/modules/users/dtos/requests';
import { CreateUserWithProfile } from 'src/modules/users/intefaces/create-user-with-profile.interface';
import bcrypt from 'bcryptjs';
import { User } from 'src/generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  createUser(data: CreateUserDto) {
    return this.prismaService.user.create({
      data,
    });
  }
  getAllUsers() {
    return this.prismaService.humanProfile.findMany();
  }

  async getUserById(userId: string) {
    const user = await this.prismaService.humanProfile.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return user;
  }

  async updateUser(userId: string, data: UpdateUserDto) {
    await this.getUserById(userId);

    return this.prismaService.user.update({
      where: { id: userId },
      data,
    });
  }

  async deleteUser(userId: string) {
    await this.getUserById(userId);
    return this.prismaService.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  // **************************************************************** //

  async createHumanProfile(data: CreateHumanDto) {
    const { password, ...rest } = data;

    const passwordHash = await bcrypt.hash(password, 10);

    return this.prismaService.humanProfile.create({
      data: {
        ...rest,
        passwordHash,
      },
    });
  }

  async updateHumanProfile(userId: string, data: UpdateHumanDto) {
    await this.getUserById(userId);

    return this.prismaService.humanProfile.update({
      where: { userId },
      data,
    });
  }

  async getHumanProfileByUsername(username: string) {
    const profile = await this.prismaService.humanProfile.findUnique({
      where: { username },
    });

    if (!profile) {
      throw new NotFoundException('Perfil humano no encontrado.');
    }

    return profile;
  }

  async activateUser(userId: string) {
    await this.getUserById(userId);

    return this.prismaService.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  async getHumanProfileById(userId: string) {
    await this.getUserById(userId);

    return await this.prismaService.humanProfile.findUniqueOrThrow({
      where: { userId },
      include: {
        user: true,
      },
    });
  }

  // **************************************************************** //

  /**
   * Busca un usuario por email o username
   * @param emailOrUsername - Email o username del usuario
   * @returns Perfil del usuario con datos del user asociado, o null si no existe
   */
  async findUserByUsernameOrEmail(emailOrUsername: string) {
    return this.prismaService.humanProfile.findFirst({
      where: {
        OR: [{ username: emailOrUsername }, { email: emailOrUsername }],
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Crea un usuario de tipo HUMAN con su perfil asociado en una transacción
   * @param data - Datos del usuario y perfil a crear
   * @returns Usuario creado con su perfil
   */
  async createUserWithHumanProfile(data: CreateUserWithProfile): Promise<User> {
    const { displayName, ...human } = data;

    // ========================================
    // Crear usuario y perfil en transacción
    // ========================================
    // Prisma maneja automáticamente la transacción al usar create anidado
    // Si falla la creación del perfil, también se revierte la creación del usuario
    return this.prismaService.user.create({
      data: {
        userType: UserType.HUMAN,
        displayName,
        humanProfile: {
          create: {
            ...human, // username, fullName, email, passwordHash
          },
        },
      },
    });
  }
}
