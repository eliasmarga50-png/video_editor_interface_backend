import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestId: RequestHandler = (req, res, next) => {
  const headerId = req.header('x-request-id');
  req.id = headerId && headerId.length > 0 ? headerId : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
