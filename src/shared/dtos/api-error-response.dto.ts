import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO que representa la estructura estándar de una respuesta de error de la API.
 *
 * Proporciona información clara y consistente sobre errores para el cliente y para
 * propósitos de registro/depuración.
 *
 * @property success - Indicador booleano que señala si la operación fue exitosa. En respuestas de error debe ser false.
 * @property statusCode - Código de estado HTTP numérico que describe el tipo de error (por ejemplo, 400, 404, 500).
 * @property message - Mensaje descriptivo del error destinado al cliente; puede ser una cadena legible o, según la implementación, un arreglo de mensajes más detallados.
 * @property error - Identificador o nombre técnico de la excepción o error ocurrido (por ejemplo, "BadRequestException"), útil para la correlación en logs.
 * @property timestamp - Marca de tiempo en formato ISO 8601 que indica cuándo ocurrió el error (por ejemplo, "2025-12-24T10:19:00.000Z").
 * @property path - Ruta o endpoint solicitado que generó el error (por ejemplo, "/users/me"), útil para rastrear la ubicación del fallo.
 */
export class ApiErrorResponseDto {
  @ApiProperty({
    example: false,
    description:
      'Indicador booleano que señala si la operación fue exitosa. En respuestas de error debe ser false.',
  })
  success: boolean;

  @ApiProperty({
    example: 400,
    description:
      'Código de estado HTTP numérico que describe el tipo de error (por ejemplo, 400, 404, 500).',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Mensaje de error.',
    description:
      'Mensaje descriptivo del error destinado al cliente; puede ser una cadena o un arreglo de mensajes.',
  })
  message: string;

  @ApiProperty({
    example: 'BadRequestException',
    description:
      "Identificador o nombre técnico de la excepción o error ocurrido (por ejemplo, 'BadRequestException').",
  })
  error: string;

  @ApiProperty({
    example: '2025-12-24T10:19:00.000Z',
    description:
      'Marca de tiempo en formato ISO 8601 que indica cuándo ocurrió el error.',
  })
  timestamp: string;

  @ApiProperty({
    example: '/users/me',
    description:
      "Ruta o endpoint solicitado que generó el error (por ejemplo, '/users/me').",
  })
  path: string;
}
