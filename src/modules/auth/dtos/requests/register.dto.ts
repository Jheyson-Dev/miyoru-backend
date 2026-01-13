import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
} from 'class-validator';
import { UserType } from 'src/generated/prisma/enums';

export class RegisterDto {
  @ApiProperty({
    enum: UserType,
    description: 'Tipo de usuario',
    example: UserType.HUMAN,
    required: false, // Esto la hace opcional en Swagger
  })
  @IsEnum(UserType, { message: 'El tipo de usuario no es válido.' })
  @IsOptional()
  userType?: UserType;

  @ApiProperty({
    description: 'Nombre a mostrar del usuario',
    example: 'Juanito',
  })
  @IsString({ message: 'El nombre a mostrar debe ser una cadena de texto.' })
  displayName: string;

  @ApiProperty({
    description: 'Nombre de usuario único',
    example: 'juanito123',
  })
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto.' })
  username: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  @IsString({ message: 'El nombre completo debe ser una cadena de texto.' })
  fullName: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'juanito@example.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    minLength: 6,
    example: 'secreto123',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;
}
