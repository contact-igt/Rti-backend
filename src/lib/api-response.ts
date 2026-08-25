import type { Response } from 'express';

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function fail(res: Response, status: number, code: string, message: string): Response {
  return res.status(status).json({
    success: false,
    error: { code, message }
  });
}
