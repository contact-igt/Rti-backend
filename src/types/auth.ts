import type { z } from 'zod';
import type { demoSessionSchema, demoUserSchema } from '../schemas/auth.js';

export type DemoUser = z.infer<typeof demoUserSchema>;
export type DemoSession = z.infer<typeof demoSessionSchema>;
export type AuthContext = {
  user: DemoUser;
  token: string;
  expiresAt: string;
};
