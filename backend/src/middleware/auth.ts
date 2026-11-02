import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

// Расширяем стандартный интерфейс Request от Express, чтобы добавить туда нашего пользователя
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware для проверки JWT токена
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // Проверяем, есть ли заголовок и начинается ли он с "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Требуется авторизация'
    });
  }

  // Извлекаем сам токен (убираем первые 7 символов "Bearer ")
  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  // Если токен невалиден или просрочен
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Недействительный или просроченный токен'
    });
  }

  // Сохраняем данные пользователя в запрос, чтобы использовать их в роутах
  req.user = payload;
  next(); // Передаем управление дальше
}

/**
 * Middleware для проверки роли SUPER_ADMIN
 * Должен использоваться ПОСЛЕ authMiddleware
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещен. Требуются права администратора.'
    });
  }
  next();
}