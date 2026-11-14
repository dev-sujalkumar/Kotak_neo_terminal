import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tradingMode: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For demo convenience, allow a fallback demo user ID if no bearer token provided
    req.user = {
      id: 'aecfaea4-9ef4-49f1-9c77-1ba65064ad38', // Seed demo user ID or fallback
      email: 'user@kotaktrade.com',
      tradingMode: 'PAPER',
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      tradingMode: decoded.tradingMode || 'PAPER',
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
}
