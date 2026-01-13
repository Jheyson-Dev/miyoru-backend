import { Injectable, BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { UsersService } from 'src/modules/users/services/users.service';
import { createExpiringToken, validateExpiringToken } from '../utils';

@Injectable()
export class EmailVerificationService {
  // Lógica para el servicio de verificación de email
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UsersService,
  ) {}

  createEmailToken(userId: string) {
    const { token, expiresAt } = createExpiringToken(1);

    return this.prismaService.emailVerifications.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async verifyToken(token: string) {
    const record = await this.prismaService.emailVerifications.findUnique({
      where: { token },
    });

    if (!record) {
      throw new BadRequestException('Token inválido.');
    }

    const now = DateTime.utc();

    if (validateExpiringToken(record.expiresAt) === false) {
      await this.prismaService.emailVerifications.delete({
        where: { id: record.id },
      });

      throw new BadRequestException('Token expirado.');
    }

    // Marcar el email como verificado
    await this.markHumanAsVerified(record.userId);

    // Activar el usuario
    await this.userService.activateUser(record.userId);

    // Marcar el token como verificado
    await this.markEmailAsVerified(record.userId, now.toJSDate(), record.token);
  }

  markHumanAsVerified(userId: string) {
    return this.prismaService.humanProfile.update({
      where: { userId },
      data: { emailVerified: true },
    });
  }

  markEmailAsVerified(userId: string, verifiedAt: Date, token: string) {
    return this.prismaService.emailVerifications.update({
      where: { userId: userId, token },
      data: { verified: true, verifiedAt },
    });
  }
}
