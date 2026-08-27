import { env } from '../config/env.js';
import { demoUserSchema } from '../schemas/auth.js';

export const demoCitizen = demoUserSchema.parse({
  id: 'user_demo_citizen',
  email: env.DEMO_USER_EMAIL,
  displayName: 'Demo Citizen',
  role: 'citizen',
  prototype: true
});
