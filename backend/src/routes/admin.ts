import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/users — список пользователей с поиском по телефону
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const phoneFilter = req.query.phone as string | undefined;
    
    const where = phoneFilter ? {
      phone: { contains: phoneFilter.replace(/\D/g, '') }
    } : {};

    const users = await prisma.user.findMany({
      where,
      include: {
        wallet: { select: { balance: true } },
        _count: { select: { referrals: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const result = users.map(u => ({
      id: u.id,
      phone: u.phone,
      role: u.role,
      balance: u.wallet?.balance ?? 0,
      referralCount: u._count.referrals,
      createdAt: u.createdAt
    }));

    res.json({ success: true, users: result });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// GET /api/admin/users/:id — полная карточка пользователя
router.get('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 50
            }
          }
        },
        referredBy: { select: { id: true, phone: true } },
        referrals: {
          select: { id: true, phone: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        balance: user.wallet?.balance ?? 0,
        referredBy: user.referredBy,
        referrals: user.referrals,
        transactions: user.wallet?.transactions ?? []
      }
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// POST /api/admin/users/:id/wallet/adjust — Ручное изменение баланса
router.post('/users/:id/wallet/adjust', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { amount, type, description, referenceId } = req.body;

    // Валидация
    if (typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({ success: false, message: 'Сумма должна быть числом и не равна 0' });
    }
    if (typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Описание обязательно и минимум 10 символов' });
    }

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { wallet: true } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    // Если у пользователя еще нет кошелька, создаем его с балансом 0
    let walletId = user.wallet?.id;
    if (!walletId) {
      const newWallet = await prisma.wallet.create({
        data: { userId: user.id, balance: 0 }
      });
      walletId = newWallet.id;
    }

    // Атомарная транзакция: обновляем баланс и создаем запись в истории
    await prisma.$transaction(async (tx) => {
      // 1. Обновляем баланс (increment работает и с отрицательными числами для списания)
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } }
      });

      // 2. Создаем запись в истории транзакций
      await tx.transaction.create({
        data: {
          walletId,
          amount,
          type: type || 'MANUAL_ADJUSTMENT',
          description: description.trim(),
          referenceId: referenceId || null
        }
      });
    });

    // Логируем действие админа
    console.log(`[ADMIN ACTION] Admin (ID: ${req.user?.userId}) adjusted wallet of user ${userId} by ${amount}. Reason: ${description}`);

    res.json({ success: true, message: 'Баланс успешно обновлен' });
  } catch (err) {
    console.error('Admin wallet adjust error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при изменении баланса' });
  }
});

export default router;