import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';
import { randomUUID } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// POST /api/tickets — покупка/генерация билета с финансовой логикой
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { eventId, bonusAmount = 0 } = req.body;
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId обязателен' });
    }
    if (typeof bonusAmount !== 'number' || bonusAmount < 0) {
      return res.status(400).json({ success: false, message: 'Некорректная сумма бонусов' });
    }

    // 🔧 ИСПРАВЛЕНО: добавлен _count для отладки (ticketsCount)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { tickets: true } }
      }
    });
    if (!event || !event.isActive) {
      return res.status(404).json({ success: false, message: 'Мероприятие не найдено или не активно' });
    }

    // 🔧 ИСПРАВЛЕНО: убрана ранняя проверка maxTickets <= 0
    // По ТЗ maxTickets = 0 означает безлимит.
    // Проверка мест происходит внутри транзакции через атомарное уменьшение.

    const ticketPrice = event.price;
    if (bonusAmount > ticketPrice) {
      return res.status(400).json({ success: false, message: 'Сумма бонусов не может превышать стоимость билета' });
    }
    const realMoneyAmount = ticketPrice - bonusAmount;
    const referrerBonusAmount = Math.round(event.referrerBonus * (realMoneyAmount / ticketPrice));

    // АТОМАРНАЯ ТРАНЗАКЦИЯ
    const result = await prisma.$transaction(async (tx) => {
      // 1. Проверка на дубликат билета
      const existingTicket = await tx.ticket.findUnique({
        where: { userId_eventId: { userId, eventId } }
      });
      if (existingTicket) {
        throw new Error('У вас уже есть билет на это мероприятие');
      }

      // 🔧 ИСПРАВЛЕНО: атомарное уменьшение maxTickets только если он > 0
      // Если maxTickets = null или 0 — безлимит, пропускаем проверку
      if (event.maxTickets !== null && event.maxTickets !== undefined && event.maxTickets > 0) {
        const updatedEvent = await tx.event.update({
          where: {
            id: eventId,
            maxTickets: { gt: 0 } // Ключевое условие: уменьшаем только если мест ещё есть
          },
          data: {
            maxTickets: { decrement: 1 }
          }
        });
        // Если update вернул null — мест не осталось (race condition защищён)
        if (!updatedEvent) {
          throw new Error('Места закончились');
        }
      }

      // 2. Получаем или создаем кошелек покупателя
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 0 } });
      }

      // 3. Атомарное списание бонусов с защитой от минуса (gte)
      if (bonusAmount > 0) {
        const updatedWallet = await tx.wallet.update({
          where: { 
            userId,
            balance: { gte: bonusAmount }
          },
          data: { balance: { decrement: bonusAmount } }
        });
        if (!updatedWallet) {
          throw new Error('Недостаточно бонусов на балансе');
        }
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -bonusAmount,
            type: 'TICKET_PURCHASE',
            description: `Списание бонусов за билет: ${event.title}`,
            totalAmount: ticketPrice,
            paidWithBonuses: bonusAmount,
            realMoneyAmount: realMoneyAmount,
            status: 'AVAILABLE',
            referenceId: `ticket_req_${eventId}`
          }
        });
      }

      // 4. Создание билета
      const ticket = await tx.ticket.create({
        data: {
          userId,
          eventId,
          qrCode: randomUUID(),
          status: 'ACTIVE'
        }
      });

      // 5. Начисление бонуса рефереру
      const buyer = await tx.user.findUnique({ 
        where: { id: userId },
        select: { referredById: true }
      });
      if (buyer?.referredById && referrerBonusAmount > 0) {
        const referrerWallet = await tx.wallet.findUnique({ where: { userId: buyer.referredById } });
        if (referrerWallet) {
          await tx.wallet.update({
            where: { userId: buyer.referredById },
            data: { balance: { increment: referrerBonusAmount } }
          });
          const unlockDate = new Date(event.eventDate);
          unlockDate.setDate(unlockDate.getDate() + 14);
          await tx.transaction.create({
            data: {
              walletId: referrerWallet.id,
              amount: referrerBonusAmount,
              type: 'REFERRAL_BONUS',
              description: `Бонус за приглашенного на: ${event.title} (разморозка: ${unlockDate.toLocaleDateString()})`,
              totalAmount: ticketPrice,
              paidWithBonuses: bonusAmount,
              realMoneyAmount: realMoneyAmount,
              status: 'PENDING',
              unlockDate: unlockDate,
              referenceId: ticket.id.toString()
            }
          });
        }
      }
      return ticket;
    });

    res.json({ 
      success: true, 
      message: 'Билет успешно приобретен',
      ticket: result,
      details: {
        ticketPrice,
        paidWithBonuses: bonusAmount,
        realMoneyCharged: realMoneyAmount,
        referrerBonusAccrued: referrerBonusAmount
      }
    });
  } catch (err: any) {
    console.error('Ticket purchase error:', err);
    if (err.message === 'У вас уже есть билет на это мероприятие' || 
        err.message === 'Недостаточно бонусов на балансе' ||
        err.message === 'Места закончились') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Ошибка сервера при покупке билета' });
  }
});

// GET /api/tickets/my — мои билеты
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, title: true, eventDate: true, location: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, tickets });
  } catch (err) {
    console.error('Tickets list error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// DELETE /api/tickets/:id — отмена билета пользователем (возврат места)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    const userId = req.user!.userId;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { event: true }
    });
    if (!ticket || ticket.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Билет не найден' });
    }
    if (ticket.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Можно отменить только активный билет' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.ticket.delete({ where: { id: ticketId } });
      // Возвращаем место только если был лимит
      if (ticket.event.maxTickets !== null && ticket.event.maxTickets !== undefined && ticket.event.maxTickets >= 0) {
        await tx.event.update({
          where: { id: ticket.eventId },
          data: { maxTickets: { increment: 1 } }
        });
      }
    });
    res.json({ success: true, message: 'Билет отменен, место освобождено' });
  } catch (err) {
    console.error('Ticket cancel error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;