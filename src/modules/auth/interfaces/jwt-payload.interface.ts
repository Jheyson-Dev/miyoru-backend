import { Prisma } from 'src/generated/prisma/client';

export interface JwtPayload {
  jti: string;
  displayName: string;
  email?: string;
  username?: string;
  preferences: Prisma.JsonValue;
  userId?: string;
}
