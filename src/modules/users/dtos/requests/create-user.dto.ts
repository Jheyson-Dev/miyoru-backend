import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { UserType } from 'src/generated/prisma/enums';

export class CreateUserDto {
  @ApiProperty({ enum: UserType, default: UserType.HUMAN })
  @IsEnum(UserType)
  userType: UserType = UserType.HUMAN;

  @ApiProperty()
  @IsString()
  displayName: string;
}
