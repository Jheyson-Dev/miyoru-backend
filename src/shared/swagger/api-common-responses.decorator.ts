import { applyDecorators } from '@nestjs/common';
import {
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../dto/api-succes-response.dto';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto';

/**
 * Decorador compuesto para documentar respuestas comunes de Swagger en endpoints.
 * Puedes extenderlo con más respuestas según tus necesidades.
 */
export function ApiCommonResponses(options?: { successDescription?: string }) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: options?.successDescription || 'Operación exitosa.',
      type: ApiSuccessResponseDto,
    }),
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
