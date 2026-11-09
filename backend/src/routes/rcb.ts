import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// ШАГ 2: Пользователь подтверждает, что зарегистрировался в РЦБ как ФРИ
router.post('/mark-registered', async (req: any, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { isRcbRegisteredFree: true }
    });
    res.json({ success: true, message: 'Отлично! Теперь вы можете перейти к шагу 3.' });
  } catch (err) {
    console.error('Rcb mark registered error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ШАГ 3: Пользователь заявляет, что оплатил 1990 ₽
router.post('/request-payment', async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user?.isRcbRegisteredFree) {
      return res.status(400).json({ success: false, message: 'Сначала выполните Шаг 2 (регистрация в РЦБ)' });
    }
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { rcbPaymentRequested: true }
    });
    res.json({ success: true, message: 'Заявка отправлена администратору. Ожидайте проверки.' });
  } catch (err) {
    console.error('Rcb request payment error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// Сохранение реферальной ссылки РЦБ (только для тех, кто уже получил статус СМАРТ)
router.post('/update-link', async (req: any, res: Response) => {
  try {
    const { rcbReferralLink } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    
    if (!user?.isRcbPaid) {
      return res.status(403).json({ success: false, message: 'Сначала необходимо подтвердить оплату 1990 ₽ администратором' });
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { rcbReferralLink: rcbReferralLink || null }
    });
    res.json({ success: true, message: 'Ссылка успешно сохранена' });
  } catch (err) {
    console.error('Rcb update link error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;