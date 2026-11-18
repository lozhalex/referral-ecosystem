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

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.isActive) {
      return res.status(404).json({ success: false, message: 'Мероприятие не найдено или не активно' });
    }

    const ticketPrice = event.price;
    if (bonusAmount > ticketPrice) {
      return res.status(400).json({ success: false, message: 'Сумма бонусов не может превышать стоимость билета' });
    }

    // Пропорциональный расчёт. База для бонуса реферера — только реальные деньги.
    const realMoneyAmount = ticketPrice - bonusAmount;
    
    // Масштабируем бонус реферера пропорционально доле реальной оплаты
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
            balance: { gte: bonusAmount } // Ключевая проверка: обновляем ТОЛЬКО если баланс >= суммы списания
          },
          data: { balance: { decrement: bonusAmount } }
        });

        if (!updatedWallet) {
          throw new Error('Недостаточно бонусов на балансе');
        }

        // Запись транзакции списания у покупателя
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

      // 5. Начисление бонуса рефереру (если есть и если сумма > 0)
      const buyer = await tx.user.findUnique({ 
        where: { id: userId },
        select: { referredById: true }
      });

      if (buyer?.referredById && referrerBonusAmount > 0) {
        const referrerWallet = await tx.wallet.findUnique({ where: { userId: buyer.referredById } });
        
        if (referrerWallet) {
          // Атомарное начисление на баланс реферера
          await tx.wallet.update({
            where: { userId: buyer.referredById },
            data: { balance: { increment: referrerBonusAmount } }
          });

          // Механика "В ожидании". Разморозка через 14 дней после мероприятия.
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
              status: 'PENDING', // Заморожено до наступления unlockDate
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
        err.message === 'Недостаточно бонусов на балансе') {
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

export default router;