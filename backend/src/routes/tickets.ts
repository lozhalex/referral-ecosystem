import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';
import { randomUUID } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// POST /api/tickets — генерация билета для пользователя
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId обязателен' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Мероприятие не найдено' });
    }

    if (!event.isActive) {
      return res.status(400).json({ success: false, message: 'Мероприятие не активно' });
    }

    // Проверяем, нет ли уже билета
    const existingTicket = await prisma.ticket.findUnique({
      where: { userId_eventId: { userId, eventId } }
    });

    if (existingTicket) {
      return res.status(400).json({ 
        success: false, 
        message: 'У вас уже есть билет на это мероприятие',
        ticket: existingTicket
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId,
        eventId,
        qrCode: randomUUID()
      }
    });

    res.json({ success: true, ticket });
  } catch (err) {
    console.error('Ticket create error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// GET /api/tickets/my — мои билеты
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const tickets = await prisma.ticket.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, title: true, eventDate: true, location: true } }
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