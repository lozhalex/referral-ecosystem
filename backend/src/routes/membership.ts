import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();
const prisma = new PrismaClient();

// POST /api/admin/membership/:id/toggle — переключение статуса платного участия
router.post('/:id/toggle', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const adminId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    const newStatus = !user.isPaidMember;

    // Обновляем статус в БД
    await prisma.user.update({
      where: { id: userId },
      data: { isPaidMember: newStatus }
    });

    // 📝 Обязательно пишем в журнал аудита
    await prisma.treeAuditLog.create({
      data: {
        adminId,
        targetUserId: userId,
        action: 'MEMBERSHIP_TOGGLE',
        oldData: JSON.stringify({ isPaidMember: user.isPaidMember, phone: user.phone }),
        newData: JSON.stringify({ isPaidMember: newStatus, phone: user.phone })
      }
    });

    res.json({ 
      success: true, 
      message: `Статус пользователя ${user.phone} изменен на: ${newStatus ? 'ПЛАТНЫЙ' : 'БЕСПЛАТНЫЙ'}` 
    });
  } catch (err) {
    console.error('Membership toggle error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при смене статуса' });
  }
});

export default router;