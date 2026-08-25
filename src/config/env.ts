import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65_535),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_LOGGING: z.enum(['true', 'false']).default('false')
});

export const env = envSchema.parse(process.env);
