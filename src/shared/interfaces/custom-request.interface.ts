import type { Request } from 'express';
import { Prisma } from 'src/generated/prisma/client';

export interface CustomRequest extends Request {
  user: {
    userId: string;
    displayName: string;
    email: string;
    username: string;
    preferences: Prisma.JsonValue;
    refreshToken: string;
  };
}
