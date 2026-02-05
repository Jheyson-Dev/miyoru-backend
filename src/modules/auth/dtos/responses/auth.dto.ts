import { ApiProperty } from '@nestjs/swagger';
import { UserType } from 'src/generated/prisma/enums';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Tipo de usuario',
    enum: UserType,
    example: UserType.HUMAN,
  })
  userType: UserType;

  @ApiProperty({
    description: 'Nombre visible del usuario',
    example: 'Juan Pérez',
  })
  displayName: string;

  @ApiProperty({
    description: 'URL del avatar del usuario',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Indica si el usuario está activo',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha de creación del registro',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}
