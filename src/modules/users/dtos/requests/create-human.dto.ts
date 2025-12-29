import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsDate,
  IsObject,
} from 'class-validator';

export class CreateHumanDto {
  @ApiProperty({
    description: 'Identificador único para el usuario.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Nombre de usuario único para el usuario.',
    example: 'juan_perez',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Nombre completo del usuario.',
    example: 'Juan Pérez',
  })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    description: 'Biografía opcional del usuario.',
    example: 'Desarrollador de software y amante del café.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario.',
    example: 'juan@miyoru.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Indica si el correo electrónico ha sido verificado.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiProperty({
    description: 'Contraseña para la cuenta del usuario.',
    example: 'C0ntr@s3ñ4!',
  })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono opcional del usuario.',
    example: '+34123456789',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento opcional del usuario.',
    type: String,
    format: 'date',
    example: '1990-01-01',
  })
  @IsOptional()
  @IsDate()
  birthdate?: Date;

  @ApiPropertyOptional({
    description: 'Preferencias opcionales del usuario.',
    type: 'object',
    additionalProperties: true,
    example: { tema: 'oscuro' },
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
