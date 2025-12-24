import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global para capturar y formatear errores HTTP estándar de NestJS.
 * Devuelve un formato uniforme para los errores HttpException.
 *
 * @example
 * // Se aplica automáticamente en main.ts como filtro global
 *
 * @category Filters
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * Logger para registrar errores no manejados.
   */
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Captura y formatea los errores HTTP estándar.
   * @param exception Instancia de HttpException
   * @param host Contexto de argumentos
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    // --- Contexto HTTP ---
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // --- Extracción de status y mensaje de error HTTP ---
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.message || 'Ocurrió un error';

    // --- Logging del error HTTP para monitoreo ---
    this.logger.error(`HTTP Error ${status}: ${message}`);

    // --- Respuesta HTTP uniforme para errores HTTP ---
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
