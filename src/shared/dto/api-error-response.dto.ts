import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Mensaje de error.' })
  message: string;

  @ApiProperty({ example: 'BadRequestException' })
  error: string;

  @ApiProperty({ example: '2025-12-24T10:19:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/users/me' })
  path: string;
}
