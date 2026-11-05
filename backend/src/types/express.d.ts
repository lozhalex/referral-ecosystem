import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        phone: string;
        role: string;
      };
    }
  }
}