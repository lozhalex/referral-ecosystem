import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();
const prisma = new PrismaClient();
router.use(authenticateToken);

// ==========================================
// 1. КВАРТИРЫ (Apartments)
// ==========================================

// Список квартир + кол-во счетчиков в каждой
router.get('/', async (req: any, res: Response) => {
  try {
    const apartments = await prisma.apartment.findMany({
      where: { userId: req.user.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { meters: true } } }
    });
    res.json({ success: true, apartments });
  } catch (err) {
    console.error('Zhkh apartments get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// Создать квартиру. 1 — бесплатно, 2+ — только СМАРТ
router.post('/', async (req: any, res: Response) => {
  try {
    const { comment, billingDay } = req.body;
    if (!comment || String(comment).trim() === '') {
      return res.status(400).json({ success: false, message: 'Укажите название квартиры' });
    }

    const existingCount = await prisma.apartment.count({
      where: { userId: req.user.userId, isActive: true }
    });

    if (existingCount >= 1) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { isPaidMember: true }
      });
      if (!user?.isPaidMember) {
        return res.status(403).json({
          success: false,
          code: 'NEED_SMART',
          message: 'Добавление второй и последующих квартир доступно в тарифе СМАРТ'
        });
      }
    }

    const apartment = await prisma.apartment.create({
      data: {
        userId: req.user.userId,
        comment: String(comment).slice(0, 100),
        billingDay: Math.min(28, Math.max(1, Number(billingDay) || 20))
      }
    });
    res.json({ success: true, apartment });
  } catch (err) {
    console.error('Zhkh apartment create error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// Обновить квартиру (название, день подачи)
router.put('/:id', async (req: any, res: Response) => {
  try {
    const { comment, billingDay } = req.body;
    await prisma.apartment.updateMany({
      where: { id: Number(req.params.id), userId: req.user.userId, isActive: true },
      data: {
        ...(comment !== undefined && { comment: String(comment).slice(0, 100) }),
        ...(billingDay !== undefined && { billingDay: Math.min(28, Math.max(1, Number(billingDay) || 20)) })
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Zhkh apartment update error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// Архивировать квартиру (soft-delete)
router.post('/:id/delete', async (req: any, res: Response) => {
  try {
    await prisma.apartment.updateMany({
      where: { id: Number(req.params.id), userId: req.user.userId },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Zhkh apartment delete error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;