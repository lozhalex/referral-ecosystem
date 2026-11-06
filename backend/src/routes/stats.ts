import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/stats/total-users — публичный счетчик пользователей
router.get('/total-users', async (req: Request, res: Response) => {
  try {
    const count = await prisma.user.count();
    res.json({ success: true, count });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;