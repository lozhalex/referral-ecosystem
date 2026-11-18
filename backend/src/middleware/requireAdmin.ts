import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Расширяем глобальный интерфейс Request, чтобы TypeScript не ругался на req.user
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

interface JwtPayload {
  userId: number;
  phone: string;
  role: string;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
  }

  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = { userId: decoded.userId, phone: decoded.phone, role: decoded.role };
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Недействительный токен' });
  }
}

/**
 * Middleware для проверки прав администратора.
 * Теперь пропускает как 'admin', так и 'SUPER_ADMIN'.
 * Конкретные ограничения на действия (например, запрет менять роль другого админа) 
 * проверяются внутри самих роутов (в admin.ts).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  authenticateToken(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'SUPER_ADMIN')) {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Доступ запрещен: требуются права администратора' 
      });
    }
  });
}