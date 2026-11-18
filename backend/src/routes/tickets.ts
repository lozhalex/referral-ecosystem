import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';
import { requireAdmin } from '../middleware/requireAdmin';
import { randomUUID } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// POST /api/tickets — покупка/генерация билета
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.userId;
    const { eventId, bonusAmount = 0 } = req.body;
    if (!eventId) return res.status(400).json({ success: false, message: 'eventId обязателен' });
    if (typeof bonusAmount !== 'number' || bonusAmount < 0) {
      return res.status(400).json({ success: false, message: 'Некорректная сумма бонусов' });
    }

    const event = await prisma.event.findUnique({ 
      where: { id: eventId },
      include: { _count: { select: { tickets: true } } }
    });
    if (!event || !event.isActive) {
      return res.status(404).json({ success: false, message: 'Мероприятие не найдено или не активно' });
    }

    // Проверка лимита мест
    if (event.maxTickets !== null && event.maxTickets !== undefined && event.maxTickets > 0) {
      if (event._count.tickets >= event.maxTickets) {
        return res.status(400).json({ success: false, message: 'Места закончились' });
      }
    }

    const ticketPrice = event.price;
    if (bonusAmount > ticketPrice) {
      return res.status(400).json({ success: false, message: 'Сумма бонусов не может превышать стоимость билета' });
    }
    const realMoneyAmount = ticketPrice - bonusAmount;
    const referrerBonusAmount = Math.round(event.referrerBonus * (realMoneyAmount / ticketPrice));

    const result = await prisma.$transaction(async (tx) => {
      const existingTicket = await tx.ticket.findUnique({
        where: { userId_eventId: { userId, eventId } }
      });
      if (existingTicket) throw new Error('У вас уже есть билет на это мероприятие');

      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) wallet = await tx.wallet.create({ data: { userId, balance: 0 } });

      if (bonusAmount > 0) {
        const updatedWallet = await tx.wallet.update({
          where: { userId, balance: { gte: bonusAmount } },
          data: { balance: { decrement: bonusAmount } }
        });
        if (!updatedWallet) throw new Error('Недостаточно бонусов на балансе');
        
        await tx.transaction.create({
          data: {
            walletId: wallet.id, amount: -bonusAmount, type: 'TICKET_PURCHASE',
            description: `Списание бонусов за билет: ${event.title}`,
            totalAmount: ticketPrice, paidWithBonuses: bonusAmount, realMoneyAmount: realMoneyAmount,
            status: 'AVAILABLE', referenceId: `ticket_req_${eventId}`
          }
        });
      }

      const ticket = await tx.ticket.create({
        data: { userId, eventId, qrCode: randomUUID(), status: 'ACTIVE' }
      });

      const buyer = await tx.user.findUnique({ where: { id: userId }, select: { referredById: true } });
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
              walletId: referrerWallet.id, amount: referrerBonusAmount, type: 'REFERRAL_BONUS',
              description: `Бонус за приглашенного на: ${event.title}`,
              totalAmount: ticketPrice, paidWithBonuses: bonusAmount, realMoneyAmount: realMoneyAmount,
              status: 'PENDING', unlockDate: unlockDate, referenceId: ticket.id.toString()
            }
          });
        }
      }
      return ticket;
    });

    res.json({ 
      success: true, message: 'Билет успешно приобретен', ticket: result,
      details: { ticketPrice, paidWithBonuses: bonusAmount, realMoneyCharged: realMoneyAmount, referrerBonusAccrued: referrerBonusAmount }
    });
  } catch (err: any) {
    console.error('Ticket purchase error:', err);
    if (err.message.includes('уже есть билет') || err.message.includes('Недостаточно бонусов') || err.message.includes('Места закончились')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Ошибка сервера при покупке билета' });
  }
});

// GET /api/tickets/my — мои билеты
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.userId;
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      include: { event: { select: { id: true, title: true, eventDate: true, location: true, price: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, tickets });
  } catch (err) {
    console.error('Tickets list error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// 🆕 GET /api/events/:eventId/tickets — список билетов мероприятия (admin)
router.get('/events/:eventId/tickets', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      include: { user: { select: { id: true, phone: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, tickets });
  } catch (err) {
    console.error('Event tickets list error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// 🆕 DELETE /api/events/:eventId/tickets/:ticketId — удаление билета админом (возврат места)
router.delete('/events/:eventId/tickets/:ticketId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const eventId = Number(req.params.eventId);
    
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.eventId !== eventId) {
        throw new Error('Билет не найден');
      }
      await tx.ticket.delete({ where: { id: ticketId } });
      
      // Возвращаем место, если был лимит
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (event && event.maxTickets !== null && event.maxTickets !== undefined && event.maxTickets >= 0) {
        await tx.event.update({
          where: { id: eventId },
          data: { maxTickets: { increment: 1 } }
        });
      }
    });
    res.json({ success: true, message: 'Билет удален, место освобождено' });
  } catch (err: any) {
    console.error('Admin ticket delete error:', err);
    res.status(500).json({ success: false, message: err.message || 'Ошибка сервера' });
  }
});

// 🆕 GET /api/events/:eventId/tickets/export — экспорт в CSV (admin)
router.get('/events/:eventId/tickets/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      include: { user: { select: { phone: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    const csvRows = [['ID', 'Телефон', 'Статус', 'Дата получения', 'Дата использования']];
    tickets.forEach(t => {
      csvRows.push([
        t.id.toString(),
        t.user.phone,
        t.status,
        t.createdAt.toISOString(),
        t.scannedAt ? t.scannedAt.toISOString() : ''
      ]);
    });
    
    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tickets_event_${eventId}.csv`);
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    console.error('Tickets export error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;