import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type UserRole = 'user' | 'pro' | 'admin';

const ROLE_ORDER: UserRole[] = ['user', 'pro', 'admin'];

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ success: false, message: 'Missing access token' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; role: UserRole };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err: unknown) {
    const isExpired = (err as { name?: string }).name === 'TokenExpiredError';
    const message = isExpired ? 'Access token expired' : 'Invalid access token';
    res.status(401).json({ success: false, message });
  }
}

export function requireRole(minimum: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    if (ROLE_ORDER.indexOf(req.user.role) < ROLE_ORDER.indexOf(minimum)) {
      res.status(403).json({ success: false, message: 'You do not have permission to do this' });
      return;
    }

    next();
  };
}
