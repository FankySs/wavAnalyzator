import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().optional(),
  TURSO_DATABASE_URL: Joi.string().optional(),
  TURSO_AUTH_TOKEN: Joi.string().optional(),
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().default('http://localhost:4200'),
  UPLOAD_DIR: Joi.string().default('uploads'),
  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().default('wav-files'),
});
