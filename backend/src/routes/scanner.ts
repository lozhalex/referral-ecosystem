import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';
import { requireController } from '../middleware/requireController';
import { distributeReferralBonus } from '../utils/referralBonus'; // 👈 Импортируем хелпер

const router = Router();
const prisma = new PrismaClient();

router.post('/scan', authenticateToken, requireController, async (req: Request, res: Response) => {
  try {
    const { qrCode, eventId } = req.body;
    const scannerUserId = req.user!.userId;

    if (!qrCode) {
      return res.status(400).json({ success: false, message: 'qrCode обязателен' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: { user: { include: { wallet: true } }, event: true }
    });

    if (!ticket) return res.status(404).json({ success: false, message: 'Билет не найден' });

    const targetEventId = eventId ? Number(eventId) : ticket.eventId;

    if (eventId && ticket.eventId !== targetEventId) {
      return res.status(400).json({ success: false, message: 'Этот билет недействителен для данного мероприятия' });
    }

    if (ticket.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: `Билет уже использован (статус: ${ticket.status})` });
    }

    const eventDate = new Date(ticket.event.eventDate);
    const now = new Date();
    if (now > eventDate) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'EXPIRED' } });
      return res.status(400).json({ success: false, message: 'Мероприятие уже прошло, билет недействителен' });
    }

    const controllerAccess = await prisma.eventController.findUnique({
      where: { eventId_userId: { eventId: targetEventId, userId: scannerUserId } }
    });

    if (!controllerAccess && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'У вас нет доступа к сканированию на этом мероприятии' });
    }

    const cashbackAmount = ticket.event.cashbackAmount;
    const referrerBonus = ticket.event.referrerBonus;

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED', scannedAt: new Date(), scannedById: scannerUserId }
      });

      let participantWalletId = ticket.user.wallet?.id;
      if (!participantWalletId) {
        const newWallet = await tx.wallet.create({ data: { userId: ticket.userId, balance: 0 } });
        participantWalletId = newWallet.id;
      }

      await tx.wallet.update({ where: { id: participantWalletId }, data: { balance: { increment: cashbackAmount } } });
      await tx.transaction.create({
        data: { walletId: participantWalletId, amount: cashbackAmount, type: 'CASHBACK_TICKET', description: `Кэшбек за посещение: ${ticket.event.title}`, referenceId: `ticket_${ticket.id}` }
      });
    });

    // 🆕 Вызываем универсальный хелпер для реферального бонуса (вне транзакции сканера, но атомарно внутри хелпера)
    const bonusResult = await distributeReferralBonus(
      ticket.userId, 
      referrerBonus, 
      `Бонус за посещение реферала: ${ticket.event.title}`
    );

    return res.json({
      success: true,
      message: 'Билет успешно использован',
      event: { id: ticket.event.id, title: ticket.event.title },
      cashback: { participant: cashbackAmount, referrer: bonusResult.paidTo === 'RESERVE_FUND' ? 0 : referrerBonus },
      bonusRouting: bonusResult
    });
  } catch (err) {
    console.error('Scanner error:', err);
    return res.status(500).json({ success: false, message: 'Ошибка сервера при сканировании' });
  }
});

export default router;