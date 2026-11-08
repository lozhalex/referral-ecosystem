import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const protectFounder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ищем ID пользователя, которого пытаются изменить/удалить/переместить
    // Поддерживаем как req.params.id (для /users/:id), так и req.body.targetUserId (для /tree/move)
    const targetUserId = Number(req.params.id) || Number(req.body.targetUserId);
    
    if (!targetUserId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (user && user.isFounder) {
      return res.status(403).json({ 
        success: false, 
        message: '🛡️ Действие отклонено: нельзя изменить, удалить или переместить основателя экосистемы' 
      });
    }

    next();
  } catch (error) {
    console.error('protectFounder error:', error);
    next(); // В случае ошибки проверки пропускаем, чтобы не ломать админку, но логируем
  }
};