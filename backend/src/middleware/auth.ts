import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tradingMode: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For demo convenience, resolve active demo user dynamically from DB
    try {
      const demoUser = (await prisma.user.findFirst({
        where: { email: 'user@kotaktrade.com' },
      })) || (await prisma.user.findFirst());

      if (demoUser) {
        req.user = {
          id: demoUser.id,
          email: demoUser.email,
          tradingMode: demoUser.tradingMode || 'PAPER',
        };
        return next();
      }
    } catch {
      // Fallback
    }

    req.user = {
      id: '8c8fb16e-1aff-4550-9863-ce1c23cf77c7',
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
