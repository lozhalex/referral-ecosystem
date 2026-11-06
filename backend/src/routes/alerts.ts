import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/alerts/balance — подозрительные операции с балансом
router.get('/balance', requireAdmin, async (req: Request, res: Response) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Крупные ручные изменения (порог 5000₽)
    const largeAdjustments = await prisma.transaction.findMany({
      where: {
        type: 'MANUAL_ADJUSTMENT',
        amount: { gt: 5000 }, // Настройте порог под себя
        createdAt: { gte: oneDayAgo }
      },
      include: {
        wallet: { include: { user: { select: { id: true, phone: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 2. Частые изменения одному пользователю (>3 раз за 24 часа)
    const frequentChanges = await prisma.transaction.groupBy({
      by: ['walletId'],
      where: {
        createdAt: { gte: oneDayAgo }
      },
      _count: { walletId: true },
      having: {
        walletId: { _count: { gt: 3 } }
      }
    });

    const frequentUsers = [];
    for (const item of frequentChanges) {
      const wallet = await prisma.wallet.findUnique({
        where: { id: item.walletId },
        include: { user: { select: { id: true, phone: true } } }
      });
      if (wallet) {
        frequentUsers.push({
          phone: wallet.user.phone,
          count: item._count.walletId,
          walletId: item.walletId
        });
      }
    }

    res.json({
      success: true,
      alerts: {
        largeAdjustments: largeAdjustments.map(t => ({
          id: t.id,
          phone: t.wallet.user.phone,
          amount: t.amount,
          description: t.description,
          createdAt: t.createdAt,
          formattedDate: new Date(t.createdAt).toLocaleString('ru-RU')
        })),
        frequentChanges: frequentUsers
      }
    });
  } catch (err) {
    console.error('Alerts error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;