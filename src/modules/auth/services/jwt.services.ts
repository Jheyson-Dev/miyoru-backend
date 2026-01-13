import { Injectable } from '@nestjs/common';
import { JwtService as JwtServiceInjectable } from '@nestjs/jwt';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class JwtService {
  // Lógica para el servicio JWT
  constructor(private readonly jwtService: JwtServiceInjectable) {}

  async generateAccessToken(
    displayName: string,
    emailOrUsername: string,
    userId: string,
  ) {
    const payload = {
      displayName,
      emailOrUsername,
      userId,
    };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '1h',
    });

    return { accessToken: token };
  }

  async generateRefreshToken(
    displayName: string,
    email: string,
    preferences: Prisma.JsonValue,
  ) {
    const payload = {
      displayName,
      email,
      preferences,
    };
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });
    return { refreshToken };
  }
}
