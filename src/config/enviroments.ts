import * as dotenv from 'dotenv';
import * as Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  PORT: Joi.number().default(3000),
}).unknown();

const validationResult = envSchema.validate(process.env);
const error = validationResult.error;
const envVars = validationResult.value as {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: number;
};

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const ENVIROMENTS = {
  DATABASE_URL: envVars.DATABASE_URL,
  JWT_SECRET: envVars.JWT_SECRET,
  PORT: envVars.PORT,
};
