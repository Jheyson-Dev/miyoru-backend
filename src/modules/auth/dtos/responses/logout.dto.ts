import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Fecha y hora en que se cerró la sesión',
    example: '2024-01-15T10:30:00Z',
  })
  loggedOutAt: Date;
}
