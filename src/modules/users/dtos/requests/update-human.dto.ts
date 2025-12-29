import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsDate,
  IsObject,
} from 'class-validator';

export class UpdateHumanDto {
  @ApiPropertyOptional({
    description: 'Unique username for the user.',
    example: 'juanperez123',
  })
  @IsOptional()
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto.' })
  username?: string;

  @ApiPropertyOptional({
    description: 'Full name of the user.',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString({ message: 'El nombre completo debe ser una cadena de texto.' })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Short biography of the user.',
    example: 'Desarrollador de software y entusiasta de la tecnología.',
  })
  @IsOptional()
  @IsString({ message: 'La biografía debe ser una cadena de texto.' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Email address of the user.',
    example: 'juan.perez@email.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Indicates if the email has been verified.',
    example: true,
  })
  @IsOptional()
  @IsBoolean({
    message: 'El valor de verificación de correo debe ser booleano.',
  })
  emailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Phone number of the user.',
    example: '+34123456789',
  })
  @IsOptional()
  @IsString({ message: 'El número de teléfono debe ser una cadena de texto.' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Birthdate of the user.',
    type: String,
    format: 'date-time',
    example: '1990-05-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de nacimiento debe ser una fecha válida.' })
  birthdate?: Date;

  @ApiPropertyOptional({
    description: 'Additional user preferences.',
    type: Object,
    example: { theme: 'dark', notifications: true },
  })
  @IsOptional()
  @IsObject({ message: 'Las preferencias deben ser un objeto.' })
  preferences?: Record<string, any>;
}
