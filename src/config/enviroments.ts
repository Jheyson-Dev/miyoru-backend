import * as dotenv from 'dotenv';
import * as Joi from 'joi';

dotenv.config();

/**
 * @fileoverview Esquema de validación de las variables de entorno para la aplicación (Joi).
 *
 * Define y valida las variables de entorno requeridas y sus formatos/valores por defecto.
 *
 * Variables documentadas:
 * - DATABASE_URL: string. URL de conexión a la base de datos. Obligatorio.
 * - JWT_SECRET: string. Clave secreta para firmar/verificar JWTs. Obligatorio.
 * - PORT: number. Puerto donde escucha la aplicación. Opcional, por defecto 3000.
 * - RESEND_API_KEY: string. Clave de API para el servicio Resend. Obligatorio.
 * - RESEND_FROM_EMAIL: string (email). Dirección de correo remitente para Resend. Obligatorio.
 *
 * @constant envSchema
 * @type {import('joi').ObjectSchema}
 * @remarks
 * El esquema permite propiedades adicionales en process.env mediante .unknown().
 * Usar envSchema.validate(process.env) o envSchema.validateAsync(process.env) para validar las variables.
 *
 * @example
 * // Validación sincrónica
 * const { error, value } = envSchema.validate(process.env);
 *
 * // Validación asíncrona
 * await envSchema.validateAsync(process.env);
 */
const envSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  PORT: Joi.number().default(3000),
  RESEND_API_KEY: Joi.string().required(),
  RESEND_FROM_EMAIL: Joi.string().email().required(),
  FRONTEND_URL: Joi.string().required(),
}).unknown();

const validationResult = envSchema.validate(process.env);
const error = validationResult.error;
const envVars = validationResult.value as {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: number;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  FRONTEND_URL: string;
};

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const ENVIROMENTS = {
  DATABASE_URL: envVars.DATABASE_URL,
  JWT_SECRET: envVars.JWT_SECRET,
  PORT: envVars.PORT,
  RESEND_API_KEY: envVars.RESEND_API_KEY,
  RESEND_FROM_EMAIL: envVars.RESEND_FROM_EMAIL,
  FRONTEND_URL: envVars.FRONTEND_URL,
};
