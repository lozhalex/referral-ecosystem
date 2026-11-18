import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const authenticateToken = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Неверный или истекший токен' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { tokenVersion: true, roles: true } // 🆕 было: role: true
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Пользователь не найден' });
      }

      if (user.tokenVersion !== decoded.version) {
        return res.status(401).json({ 
          success: false, 
          message: 'Сессия недействительна. Пожалуйста, войдите в систему заново.' 
        });
      }

      // 🆕 Добавляем массив ролей из БД в запрос
      req.user = { ...decoded, roles: user.roles };
      next();
    } catch (error) {
      console.error('Ошибка аутентификации (Token Version check):', error);
      return res.status(500).json({ success: false, message: 'Ошибка сервера при проверке токена' });
    }
  });
};