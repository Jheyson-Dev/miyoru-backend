import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import {
  CreateHumanDto,
  CreateUserDto,
  UpdateHumanDto,
  UpdateUserDto,
} from '../dtos/requests';
import bcrypt from 'bcryptjs';

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
}
