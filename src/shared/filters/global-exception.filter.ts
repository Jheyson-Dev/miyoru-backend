import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global para capturar y formatear cualquier excepción no manejada.
 * Devuelve un formato uniforme para errores inesperados.
 *
 * @example
 * // Se aplica automáticamente en main.ts como filtro global
 *
 * @category Filters
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  /**
   * Logger para registrar errores no manejados.
   */
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  /**
   * Captura y formatea cualquier excepción no manejada.
   * @param exception Instancia de error desconocido
   * @param host Contexto de argumentos
   */
  catch(exception: unknown, host: ArgumentsHost) {
    // --- Contexto HTTP ---
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // --- Inicialización de valores por defecto ---
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let errorName = 'Error';

    // --- Si la excepción es una instancia de Error, extraer nombre y mensaje ---
    if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    // --- Logging del error no manejado para monitoreo ---
    this.logger.error(`Unhandled error: ${errorName} - ${message}`);

    // --- Respuesta HTTP uniforme para errores inesperados ---
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
