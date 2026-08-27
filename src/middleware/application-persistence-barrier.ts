import type { RequestHandler, Response } from 'express';
import { flushApplicationPersistence } from '../database/application-persistence.js';

export const applicationPersistenceBarrier: RequestHandler = (_req, res, next) => {
  const sendJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(_req.method) || res.statusCode >= 400) {
      return sendJson(body);
    }
    void flushApplicationPersistence()
      .then(() => sendJson(body))
      .catch(next);
    return res;
  }) as Response['json'];

  next();
};
