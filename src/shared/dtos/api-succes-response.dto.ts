import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operación exitosa.' })
  message: string;

  @ApiProperty({ nullable: true })
  data: T;

  constructor(partial: Partial<ApiSuccessResponseDto<T>>) {
    Object.assign(this, partial);
  }
}
