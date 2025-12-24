import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global para capturar y formatear errores de validación (class-validator).
 * Devuelve un formato uniforme para los errores BadRequestException.
 *
 * @example
 * // Se aplica automáticamente en main.ts como filtro global
 *
 * @category Filters
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  /**
   * Logger para registrar errores no manejados.
   */
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  /**
   * Captura y formatea los errores de validación.
   * @param exception Instancia de BadRequestException
   * @param host Contexto de argumentos
   */
  catch(exception: BadRequestException, host: ArgumentsHost) {
    // Obtener contexto HTTP para la respuesta y la petición
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extraer el objeto de respuesta de la excepción BadRequest
    const res = exception.getResponse() as
      | { message?: string | string[] }
      | string
      | undefined;

    // Determinar el mensaje principal y los errores específicos de validación
    let message = 'Error de validación en los datos enviados';
    let errors: string[] | undefined;

    // Si la respuesta es un objeto, analizar el campo 'message'
    if (typeof res === 'object' && res !== null) {
      if (Array.isArray(res.message)) {
        // Si 'message' es un array, filtrar solo los strings
        errors = res.message.filter((m): m is string => typeof m === 'string');
      } else if (typeof res.message === 'string') {
        // Si 'message' es un string, usarlo como mensaje principal
        message = res.message;
      }
    } else if (typeof res === 'string') {
      // Si la respuesta es un string, usarlo como mensaje principal
      message = res;
    }

    // Loguear el error de validación para monitoreo
    this.logger.warn(`Validation failed: ${JSON.stringify(errors ?? message)}`);

    // Enviar respuesta HTTP con formato uniforme
    response.status(exception.getStatus()).json({
      success: false,
      statusCode: exception.getStatus(),
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
