import { z } from 'zod';

export const demoUserSchema = z.object({
  id: z.literal('user_demo_citizen'),
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(100),
  role: z.literal('citizen'),
  prototype: z.literal(true)
});

export const loginRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256)
});

export const demoSessionSchema = z.object({
  token: z.string().min(32),
  userId: z.string().min(1),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});
