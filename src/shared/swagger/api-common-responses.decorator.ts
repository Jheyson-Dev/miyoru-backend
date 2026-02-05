import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../dtos';

/**
 * Decorador compuesto para documentar respuestas comunes de Swagger en endpoints.
 * Puedes extenderlo con más respuestas según tus necesidades.
 */
export function ApiCommonResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Solicitud inválida.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'No autorizado.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Prohibido.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'No encontrado.',
      type: ApiErrorResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description: 'Error interno del servidor.',
      type: ApiErrorResponseDto,
    }),
  );
}
