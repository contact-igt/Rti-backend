import OpenAI from 'openai';
import { env } from '../../config/env.js';

export const openaiClient = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 1,
      timeout: 15_000
    })
  : null;
