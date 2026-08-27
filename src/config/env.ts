import 'dotenv/config';
import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional()
);

const frontendOriginSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .url()
    .transform((value, context) => {
      const url = new URL(value);
      if (url.origin !== value.replace(/\/$/, '') || url.username || url.password) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'FRONTEND_ORIGIN must be an origin without a path, query, or credentials'
        });
        return z.NEVER;
      }
      return url.origin;
    })
    .optional()
);

const envSchema = z
  .object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DB_HOST: z.string().trim().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
  DB_NAME: z.string().trim().min(1).default('rti_saathi'),
  DB_USER: z.string().trim().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_LOGGING: z.enum(['true', 'false']).default('false'),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(3_000),
  DEMO_MODE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  DEMO_USER_EMAIL: z.string().trim().email().default('demo@example.invalid'),
  DEMO_USER_PASSWORD: z.string().max(256).default(''),
  DEMO_SESSION_TTL_MINUTES: z.coerce.number().int().min(1).max(10_080).default(480),
  DEMO_PAYMENT_PROOF_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(2).max(100).default(8),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(900_000),
  JSON_BODY_LIMIT: z.string().trim().regex(/^\d+(?:kb|mb)$/i).default('1mb'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),
  FRONTEND_ORIGIN: frontendOriginSchema,
  FRONTEND_URL: frontendOriginSchema,
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_MODEL: optionalNonEmptyString,
  OPENAI_RTI_VECTOR_STORE_ID: optionalNonEmptyString
  })
  .superRefine((value, context) => {
    if (value.DEMO_MODE && value.DEMO_USER_PASSWORD.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DEMO_USER_PASSWORD'],
        message: 'DEMO_USER_PASSWORD is required when DEMO_MODE=true'
      });
    }
  });

export const env = envSchema.parse(process.env);
