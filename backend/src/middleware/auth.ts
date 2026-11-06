import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

// Расширяем стандартный интерфейс Request от Express
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Константы ролей для избежания опечаток в коде
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CONTROLLER: 'controller',
  SYSTEM: 'system',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Middleware для проверки JWT токена
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Требуется авторизация'
    });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Недействительный или просроченный токен'
    });
  }

  req.user = payload;
  next();
}

/**
 * Middleware для проверки прав администратора (admin ИЛИ SUPER_ADMIN)
 * Должен использоваться ПОСЛЕ authMiddleware
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN)) {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещен. Требуются права администратора.'
    });
  }
  next();
}

/**
 * Middleware для проверки прав СУПЕР-администратора (ТОЛЬКО SUPER_ADMIN)
 * Должен использоваться ПОСЛЕ authMiddleware
 */
export function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещен. Требуются права супер-администратора.'
    });
  }
  next();
}