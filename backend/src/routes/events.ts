import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();
const prisma = new PrismaClient();

// GET /api/events — список активных мероприятий с контролерами
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { eventDate: 'asc' },
      include: {
        _count: { select: { tickets: true, controllers: true } },
        controllers: {
          include: {
            user: { select: { id: true, phone: true, role: true } }
          }
        }
      }
    });

    const result = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      eventDate: e.eventDate,
      cashbackAmount: e.cashbackAmount,
      referrerBonus: e.referrerBonus,
      isActive: e.isActive,
      ticketsCount: e._count.tickets,
      controllersCount: e._count.controllers,
      controllers: e.controllers
    }));

    res.json({ success: true, events: result });
  } catch (err) {
    console.error('❌ Events list error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при загрузке мероприятий' });
  }
});

// POST /api/events — создание мероприятия (только admin)
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, location, eventDate, cashbackAmount, referrerBonus } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ success: false, message: 'Название и дата обязательны' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        location: location || null,
        eventDate: new Date(eventDate),
        cashbackAmount: Number(cashbackAmount) || 50,
        referrerBonus: Number(referrerBonus) || 100
      }
    });

    res.json({ success: true, event });
  } catch (err) {
    console.error('❌ Event create error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при создании мероприятия' });
  }
});

// POST /api/events/:id/controllers — назначение контролера (только admin)
router.post('/:id/controllers', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId обязателен' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Мероприятие не найдено' });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    if (user.role !== 'controller' && user.role !== 'admin') {
      await prisma.user.update({ where: { id: Number(userId) }, data: { role: 'controller' } });
    }

    const controller = await prisma.eventController.create({
      data: { eventId, userId: Number(userId) }
    });

    res.json({ success: true, controller });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Этот контролер уже назначен на мероприятие' });
    }
    console.error('❌ Event controller error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при назначении контролера' });
  }
});

// 🆕 DELETE /api/events/:eventId/controllers/:userId — удаление контролера (только admin)
router.delete('/:eventId/controllers/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const userId = Number(req.params.userId);

    await prisma.eventController.delete({
      where: {
        eventId_userId: { eventId, userId }
      }
    });

    res.json({ success: true, message: 'Контролер успешно удален с мероприятия' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Назначение не найдено' });
    }
    console.error('❌ Event controller delete error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при удалении контролера' });
  }
});

export default router;