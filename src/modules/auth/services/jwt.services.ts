import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as JwtServiceInjectable } from '@nestjs/jwt';
import { Prisma } from 'src/generated/prisma/client';
import { JwtPayload } from '../interfaces';

@Injectable()
export class JwtService {
  // Lógica para el servicio JWT
  constructor(private readonly jwtService: JwtServiceInjectable) {}

  async generateAccessToken(
    displayName: string,
    emailOrUsername: string,
    userId: string,
    preferences: Prisma.JsonValue,
  ) {
    const isEmail = emailOrUsername.includes('@');

    if (isEmail) {
      const payload = {
        displayName,
        email: emailOrUsername,
        userId,
        preferences,
      };
      const token = await this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      });
      return { accessToken: token };
    }

    const payload = {
      displayName,
      username: emailOrUsername,
      preferences,
      userId,
    };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    return { accessToken: token };
  }
  /**
   * Generate a refresh JWT including a `jti` identifier.
   * The caller should persist a hash of the `jti` in the database for revocation/rotation.
   */
  async generateRefreshToken(
    displayName: string,
    emailOrUsername: string,
    preferences: Prisma.JsonValue,
    jti: string,
    userId: string,
  ) {
    const isEmail = emailOrUsername.includes('@');

    const basePayload: JwtPayload = {
      displayName,
      preferences,
      jti,
      userId,
    };

    if (isEmail) {
      basePayload.email = emailOrUsername;
    } else {
      basePayload.username = emailOrUsername;
    }

    // cast options/payload to avoid type issues with different Jwt types
    const refreshToken = await this.jwtService.signAsync(basePayload, {
      expiresIn: '7d',
    });

    return { refreshToken };
  }

  async verifyToken(token: string) {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    if (!payload) {
      throw new UnauthorizedException('Token inválido.');
    }
    return payload;
  }
}
