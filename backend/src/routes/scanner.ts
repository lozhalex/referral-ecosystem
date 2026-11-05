import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';
import { requireController } from '../middleware/requireController';

const router = Router();
const prisma = new PrismaClient();

// POST /api/scanner/scan — сканирование QR контролером
router.post('/scan', authenticateToken, requireController, async (req: Request, res: Response) => {
  try {
    const { qrCode, eventId } = req.body;
    const scannerUserId = req.user!.userId;

    if (!qrCode || !eventId) {
      return res.status(400).json({ success: false, message: 'qrCode и eventId обязательны' });
    }

    // 1. Находим билет
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        user: { include: { wallet: true } },
        event: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Билет не найден' });
    }

    // 2. Проверяем, что билет на это мероприятие
    if (ticket.eventId !== Number(eventId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Этот билет недействителен для данного мероприятия' 
      });
    }

    // 3. Проверяем статус
    if (ticket.status !== 'ACTIVE') {
      return res.status(400).json({ 
        success: false, 
        message: `Билет уже использован (статус: ${ticket.status})` 
      });
    }

    // 4. Проверяем доступ контролера
    const controllerAccess = await prisma.eventController.findUnique({
      where: { eventId_userId: { eventId: Number(eventId), userId: scannerUserId } }
    });

    if (!controllerAccess && req.user!.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'У вас нет доступа к сканированию на этом мероприятии' 
      });
    }

    const cashbackAmount = ticket.event.cashbackAmount;
    const referrerBonus = ticket.event.referrerBonus;

    // 5. Атомарная транзакция
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

      await tx.wallet.update({
        where: { id: participantWalletId },
        data: { balance: { increment: cashbackAmount } }
      });

      await tx.transaction.create({
        data: {
          walletId: participantWalletId,
          amount: cashbackAmount,
          type: 'CASHBACK_TICKET',
          description: `Кэшбек за посещение: ${ticket.event.title}`,
          referenceId: `ticket_${ticket.id}`
        }
      });

      const participant = await tx.user.findUnique({
        where: { id: ticket.userId },
        include: { wallet: true }
      });

      if (participant?.referredById) {
        const referrer = await tx.user.findUnique({
          where: { id: participant.referredById },
          include: { wallet: true }
        });

        if (referrer) {
          let referrerWalletId = referrer.wallet?.id;
          if (!referrerWalletId) {
            const newWallet = await tx.wallet.create({ data: { userId: referrer.id, balance: 0 } });
            referrerWalletId = newWallet.id;
          }

          await tx.wallet.update({
            where: { id: referrerWalletId },
            data: { balance: { increment: referrerBonus } }
          });

          await tx.transaction.create({
            data: {
              walletId: referrerWalletId,
              amount: referrerBonus,
              type: 'REFERRAL_BONUS',
              description: `Бонус за посещение реферала: ${ticket.event.title}`,
              referenceId: `ticket_${ticket.id}`
            }
          });
        }
      }
    });

    return res.json({
      success: true,
      message: 'Билет успешно использован',
      cashback: { participant: cashbackAmount, referrer: referrerBonus }
    });
  } catch (err) {
    console.error('Scanner error:', err);
    return res.status(500).json({ success: false, message: 'Ошибка сервера при сканировании' });
  }
});

export default router;