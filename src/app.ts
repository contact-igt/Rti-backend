import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { healthRouter } from './routes/health.routes.js';

export const app = express();

app.use(express.json());
app.use('/api/v1/health', healthRouter);
app.use(notFound);
app.use(errorHandler);
