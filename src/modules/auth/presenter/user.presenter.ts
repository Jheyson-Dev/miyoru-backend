import { UserType } from 'src/generated/prisma/client';
import { AuthResponseDto } from '../dtos/responses';

type AuthUserInput = {
  userType: UserType;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
};

export class UserPresenter {
  static toAuthResponseDto(user: AuthUserInput): AuthResponseDto {
    return {
      userType: user.userType,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
