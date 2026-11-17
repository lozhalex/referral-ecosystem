import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();
const prisma = new PrismaClient();

// GET /api/events — список мероприятий
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
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
      posterUrl: e.posterUrl,
      isFree: e.isFree,
      maxTickets: e.maxTickets,
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
    const { title, description, location, eventDate, cashbackAmount, referrerBonus, posterUrl, isFree, maxTickets } = req.body;
    if (!title || !eventDate) {
      return res.status(400).json({ success: false, message: 'Название и дата обязательны' });
    }
    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        location: location || null,
        eventDate: new Date(eventDate),
        cashbackAmount: cashbackAmount !== undefined ? Number(cashbackAmount) : (isFree ? 0 : 50),
        referrerBonus: referrerBonus !== undefined ? Number(referrerBonus) : (isFree ? 0 : 100),
        posterUrl: posterUrl || null,
        isFree: Boolean(isFree),
        maxTickets: maxTickets !== undefined && maxTickets !== '' ? Number(maxTickets) : null
      }
    });
    res.json({ success: true, event });
  } catch (err) {
    console.error('❌ Event create error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при создании мероприятия' });
  }
});

// PUT /api/events/:id — редактирование мероприятия (только admin)
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const { title, description, location, eventDate, cashbackAmount, referrerBonus, posterUrl, isFree, maxTickets } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ success: false, message: 'Название и дата обязательны' });
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description: description !== undefined ? description : null,
        location: location !== undefined ? location : null,
        eventDate: new Date(eventDate),
        cashbackAmount: cashbackAmount !== undefined ? Number(cashbackAmount) : 0,
        referrerBonus: referrerBonus !== undefined ? Number(referrerBonus) : 0,
        posterUrl: posterUrl !== undefined ? posterUrl : null,
        isFree: Boolean(isFree),
        maxTickets: maxTickets !== undefined && maxTickets !== '' ? Number(maxTickets) : null
      }
    });
    res.json({ success: true, event });
  } catch (err) {
    console.error('❌ Event update error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при редактировании мероприятия' });
  }
});

// POST /api/events/:id/controllers — назначение контролера
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

// DELETE /api/events/:eventId/controllers/:userId
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

// 🆕 GET /api/events/:id/tickets — список билетов мероприятия (только admin)
router.get('/:id/tickets', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Мероприятие не найдено' });
    }
    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, phone: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json({
      success: true,
      event: {
        title: event.title,
        maxTickets: event.maxTickets,
        ticketsCount: tickets.length
      },
      tickets: tickets.map(t => ({
        id: t.id,
        phone: t.user.phone,
        status: t.status,
        scannedAt: t.scannedAt,
        createdAt: t.createdAt
      }))
    });
  } catch (err) {
    console.error('❌ Event tickets list error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// 🆕 DELETE /api/events/:id/tickets/:ticketId — удаление билета (только admin)
// Автоматически увеличивает maxTickets на 1
router.delete('/:id/tickets/:ticketId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const ticketId = Number(req.params.ticketId);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.eventId !== eventId) {
      return res.status(404).json({ success: false, message: 'Билет не найден' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.ticket.delete({ where: { id: ticketId } });
      // Увеличиваем maxTickets на 1, если он задан
      await tx.event.update({
        where: { id: eventId },
        data: { maxTickets: { increment: 1 } }
      });
    });
    res.json({ success: true, message: 'Билет удален, место освобождено' });
  } catch (err) {
    console.error('❌ Ticket delete error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// 🆕 GET /api/events/:id/tickets/export — экспорт списка участников в CSV
router.get('/:id/tickets/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Мероприятие не найдено' });
    }
    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      include: {
        user: { select: { phone: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    const csvRows = ['Телефон,Статус,Дата получения,Дата использования'];
    for (const t of tickets) {
      const status = t.status === 'ACTIVE' ? 'Активен' : t.status === 'USED' ? 'Использован' : t.status;
      const created = t.createdAt ? new Date(t.createdAt).toLocaleString('ru-RU') : '';
      const scanned = t.scannedAt ? new Date(t.scannedAt).toLocaleString('ru-RU') : '';
      csvRows.push(`"${t.user.phone}","${status}","${created}","${scanned}"`);
    }
    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="participants_event_${eventId}.csv"`);
    res.send('\ufeff' + csv); // BOM для корректного отображения кириллицы в Excel
  } catch (err) {
    console.error('❌ Tickets export error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;