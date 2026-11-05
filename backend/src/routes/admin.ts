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

export default router;