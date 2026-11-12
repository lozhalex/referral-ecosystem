import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const protectFounder = async (req: any, res: Response, next: NextFunction) => {
  try {
    // Определяем ID целевого пользователя (из params или body)
    const targetUserId = req.params.id ? Number(req.params.id) : req.body.userId;
    
    if (!targetUserId) {
      return next(); // Если ID нет, пропускаем (валидация произойдет в другом месте)
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isFounder: true, phone: true }
    });

    if (targetUser?.isFounder) {
      // ✅ ИСКЛЮЧЕНИЕ ДЛЯ SUPER_ADMIN: разрешаем, но логируем
      if (req.user?.role === 'SUPER_ADMIN') {
        await prisma.treeAuditLog.create({
          data: {
            userId: req.user.userId,
            action: 'FOUNDER_MODIFICATION_ALLOWED',
            details: `SUPER_ADMIN (ID: ${req.user.userId}) изменил данные основателя (ID: ${targetUserId}, Phone: ${targetUser.phone}). Изменения: ${JSON.stringify(req.body)}`,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown'
          }
        });
        
        console.log(`[AUDIT] SUPER_ADMIN modified founder ${targetUserId}`);
        return next(); // Пропускаем запрос дальше
      }
      
      // ❌ ЖЕСТКИЙ ЗАПРЕТ для admin, cashier, controller и обычных user
      return res.status(403).json({ 
        success: false, 
        message: 'Доступ запрещен: нельзя изменять данные, роль или баланс основателей (founders).' 
      });
    }

    // Если пользователь не основатель, просто пропускаем
    next();
  } catch (error) {
    console.error('protectFounder middleware error:', error);
    res.status(500).json({ success: false, message: 'Ошибка проверки прав основателя' });
  }
};