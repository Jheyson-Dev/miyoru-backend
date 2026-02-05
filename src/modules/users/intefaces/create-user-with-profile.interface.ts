import { UserType } from '../../../generated/prisma/enums';

export interface CreateUserWithProfile {
  displayName: string;
  username: string;
  fullName: string;
  email: string;
  passwordHash: string;
}
