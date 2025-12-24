import { applyDecorators } from '@nestjs/common';
import {
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

/**
 * Decorador compuesto para documentar respuestas comunes de Swagger en endpoints.
 * Puedes extenderlo con más respuestas según tus necesidades.
 */
export function ApiCommonResponses(options?: { successDescription?: string }) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: options?.successDescription || 'Operación exitosa.',
    }),
    ApiBadRequestResponse({ description: 'Solicitud inválida.' }),
    ApiUnauthorizedResponse({ description: 'No autorizado.' }),
    ApiForbiddenResponse({ description: 'Prohibido.' }),
    ApiNotFoundResponse({ description: 'No encontrado.' }),
    ApiInternalServerErrorResponse({
      description: 'Error interno del servidor.',
    }),
  );
}
