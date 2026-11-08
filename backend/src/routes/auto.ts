import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();
const prisma = new PrismaClient();

// Применяем middleware авторизации ко всем роутам в этом файле
router.use(authenticateToken);

// ==========================================
// 1. АВТОМОБИЛИ (Cars)
// ==========================================

// GET /api/auto/cars — список авто пользователя
router.get('/cars', async (req: any, res: Response) => {
  try {
    const cars = await prisma.car.findMany({
      where: { userId: req.user.userId, isDeleted: false },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, cars });
  } catch (err) {
    console.error('Auto cars get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// POST /api/auto/cars — добавить авто
router.post('/cars', async (req: any, res: Response) => {
  try {
    const { marka, model, year, gosnomer, vin, mileage } = req.body;
    const car = await prisma.car.create({
      data: {
        userId: req.user.userId,
        marka: marka || '',
        model: model || '',
        year: year || '',
        gosnomer: gosnomer || '',
        vin: vin || '',
        mileage: Number(mileage) || 0
      }
    });
    res.json({ success: true, car });
  } catch (err) {
    console.error('Auto car create error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// PUT /api/auto/cars/:id — обновить авто
router.put('/cars/:id', async (req: any, res: Response) => {
  try {
    const { marka, model, year, gosnomer, vin, mileage } = req.body;
    await prisma.car.updateMany({
      where: { id: Number(req.params.id), userId: req.user.userId },
      data: {
        marka: marka || '',
        model: model || '',
        year: year || '',
        gosnomer: gosnomer || '',
        vin: vin || '',
        mileage: Number(mileage) || 0
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Auto car update error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// POST /api/auto/cars/:id/delete — мягкое удаление (soft delete)
router.post('/cars/:id/delete', async (req: any, res: Response) => {
  try {
    await prisma.car.updateMany({
      where: { id: Number(req.params.id), userId: req.user.userId },
      data: { isDeleted: true }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Auto car delete error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 2. ЖУРНАЛ ОБСЛУЖИВАНИЯ (Journal)
// ==========================================

// GET /api/auto/journal — записи журнала (можно фильтровать по carId)
router.get('/journal', async (req: any, res: Response) => {
  try {
    const carId = req.query.carId ? Number(req.query.carId) : undefined;
    const records = await prisma.serviceRecord.findMany({
      where: { 
        userId: req.user.userId,
        ...(carId && { carId })
      },
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, records });
  } catch (err) {
    console.error('Auto journal get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// POST /api/auto/journal — добавить запись
router.post('/journal', async (req: any, res: Response) => {
  try {
    const { carId, date, mileage, category, subcat, work, cost, comment } = req.body;
    
    // Создаем запись в журнале
    const record = await prisma.serviceRecord.create({
      data: {
        userId: req.user.userId,
        carId: Number(carId),
        date: date || '',
        mileage: Number(mileage) || 0,
        category: category || '',
        subcat: subcat || '',
        work: work || '',
        cost: Number(cost) || 0,
        comment: comment || ''
      }
    });

    // Если пробег в записи больше текущего пробега авто — обновляем авто
    if (carId && mileage) {
      await prisma.car.updateMany({
        where: { id: Number(carId), userId: req.user.userId, mileage: { lt: Number(mileage) } },
        data: { mileage: Number(mileage) }
      });
    }

    res.json({ success: true, record });
  } catch (err) {
    console.error('Auto journal create error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 3. ИНТЕРВАЛЫ И ПРОГНОЗ (Reminders / Intervals)
// ==========================================

// GET /api/auto/intervals — получить настройки интервалов
router.get('/intervals', async (req: any, res: Response) => {
  try {
    const interval = await prisma.serviceInterval.findUnique({
      where: { userId: req.user.userId }
    });
    res.json({ 
      success: true, 
      intervals: interval ? JSON.parse(interval.data) : null 
    });
  } catch (err) {
    console.error('Auto intervals get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// POST /api/auto/intervals — сохранить настройки интервалов
router.post('/intervals', async (req: any, res: Response) => {
  try {
    const data = JSON.stringify(req.body.intervals || {});
    await prisma.serviceInterval.upsert({
      where: { userId: req.user.userId },
      update: { data },
      create: { userId: req.user.userId, data }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Auto intervals save error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// GET /api/auto/dashboard — данные для главной (плитки прогноза)
router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const carId = req.query.carId ? Number(req.query.carId) : undefined;
    
    // Получаем авто, журнал и интервалы одним запросом
    const [cars, records, intervalRow] = await Promise.all([
      prisma.car.findMany({ where: { userId: req.user.userId, isDeleted: false } }),
      prisma.serviceRecord.findMany({ 
        where: { userId: req.user.userId, ...(carId && { carId }) },
        orderBy: { date: 'desc' }
      }),
      prisma.serviceInterval.findUnique({ where: { userId: req.user.userId } })
    ]);

    const intervals = intervalRow ? JSON.parse(intervalRow.data) : {};

    res.json({ success: true, cars, records, intervals });
  } catch (err) {
    console.error('Auto dashboard error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;