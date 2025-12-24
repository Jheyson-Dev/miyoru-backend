import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Response, Request } from 'express';

/**
 * Filtro global para capturar y formatear errores de Prisma.
 * Devuelve un formato uniforme para los errores PrismaClientKnownRequestError.
 *
 * @example
 * // Se aplica automáticamente en main.ts como filtro global
 *
 * @category Filters
 */
@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  /**
   * Logger para registrar errores no manejados.
   */
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  /**
   * Captura y formatea los errores de Prisma.
   * @param exception Instancia de PrismaClientKnownRequestError
   * @param host Contexto de argumentos
   */
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    // --- Contexto HTTP ---
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // --- Extracción de código y mensaje de error de Prisma ---
    const code = exception.code || 'PRISMA_ERROR';
    const message = exception.message || 'Error en la base de datos';

    // --- Logging del error de Prisma para monitoreo ---
    this.logger.error(`Prisma error: ${code} - ${message}`);

    // --- Respuesta HTTP uniforme para errores de Prisma ---
    response.status(400).json({
      success: false,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
