import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Correo electrónico o nombre de usuario del usuario',
    example: 'juanito@example.com',
  })
  @IsNotEmpty({
    message: 'El correo electrónico o nombre de usuario es obligatorio.',
  })
  @IsString({
    message:
      'El correo electrónico o nombre de usuario debe ser una cadena de texto.',
  })
  emailOrUsername: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'secreto123',
  })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  password: string;
}
