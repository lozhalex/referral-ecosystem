import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// ==========================================
// 1. АВТОМОБИЛИ (Cars)
// ==========================================

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

router.post('/journal', async (req: any, res: Response) => {
  try {
    const { carId, date, mileage, category, subcat, work, cost, comment } = req.body;
    
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

    // Обновляем пробег авто, если новый пробег больше текущего
    if (carId && mileage) {
      await prisma.car.updateMany({
        where: { 
          id: Number(carId), 
          userId: req.user.userId,
          mileage: { lt: Number(mileage) }
        },
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

// ==========================================
// 4. ВВОД ПРОБЕГА (Mileage Check)
// ==========================================

router.post('/mileage-check', async (req: any, res: Response) => {
  try {
    const { carId, km } = req.body;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Проверяем, что новый пробег не меньше последнего
    const lastCheck = await prisma.mileageCheck.findFirst({
      where: { carId: Number(carId), userId: req.user.userId },
      orderBy: { yearMonth: 'desc' }
    });

    if (lastCheck && Number(km) < lastCheck.km) {
      return res.status(400).json({ 
        success: false, 
        message: `Новый пробег не может быть меньше последнего (${lastCheck.km} км)` 
      });
    }

    // Сохраняем отметку
    await prisma.mileageCheck.upsert({
      where: { 
        carId_yearMonth: { 
          carId: Number(carId), 
          yearMonth 
        }
      },
      update: { km: Number(km) },
      create: {
        carId: Number(carId),
        userId: req.user.userId,
        yearMonth,
        km: Number(km)
      }
    });

    // Обновляем пробег авто
    await prisma.car.updateMany({
      where: { 
        id: Number(carId), 
        userId: req.user.userId,
        mileage: { lt: Number(km) }
      },
      data: { mileage: Number(km) }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Auto mileage check error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.get('/mileage-check/status', async (req: any, res: Response) => {
  try {
    const cars = await prisma.car.findMany({
      where: { userId: req.user.userId, isDeleted: false }
    });

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const checks = await prisma.mileageCheck.findMany({
      where: { 
        userId: req.user.userId,
        yearMonth
      }
    });

    const checkedCarIds = new Set(checks.map(c => c.carId));
    const uncheckedCars = cars.filter(car => !checkedCarIds.has(car.id));

    res.json({ 
      success: true, 
      uncheckedCars,
      totalCars: cars.length,
      checkedCount: checks.length
    });
  } catch (err) {
    console.error('Auto mileage check status error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 5. ДАШБОРД (все данные для главной)
// ==========================================

router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const carId = req.query.carId ? Number(req.query.carId) : undefined;
    
    const [cars, records, intervalRow, mileageChecks] = await Promise.all([
      prisma.car.findMany({ 
        where: { userId: req.user.userId, isDeleted: false } 
      }),
      prisma.serviceRecord.findMany({ 
        where: { userId: req.user.userId, ...(carId && { carId }) },
        orderBy: { date: 'desc' }
      }),
      prisma.serviceInterval.findUnique({ 
        where: { userId: req.user.userId } 
      }),
      prisma.mileageCheck.findMany({
        where: { userId: req.user.userId },
        orderBy: { yearMonth: 'desc' }
      })
    ]);

    const intervals = intervalRow ? JSON.parse(intervalRow.data) : {};

    res.json({ 
      success: true, 
      cars, 
      records, 
      intervals,
      mileageChecks
    });
  } catch (err) {
    console.error('Auto dashboard error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 6. НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ
// ==========================================

router.get('/settings', async (req: any, res: Response) => {
  try {
    const settings = await prisma.userAutoSettings.findUnique({
      where: { userId: req.user.userId }
    });
    res.json({ 
      success: true, 
      settings: settings || { mileageReminderTime: '09:00' }
    });
  } catch (err) {
    console.error('Auto settings get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/settings', async (req: any, res: Response) => {
  try {
    const { mileageReminderTime } = req.body;
    await prisma.userAutoSettings.upsert({
      where: { userId: req.user.userId },
      update: { mileageReminderTime: mileageReminderTime || '09:00' },
      create: { 
        userId: req.user.userId, 
        mileageReminderTime: mileageReminderTime || '09:00' 
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Auto settings save error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 7. УВЕДОМЛЕНИЯ (Notifications)
// ==========================================

router.get('/notifications', async (req: any, res: Response) => {
  try {
    const notifications = [];
    
    // 1. Проверка не введенного пробега
    const mileageStatus = await prisma.mileageCheck.findMany({
      where: { 
        userId: req.user.userId,
        yearMonth: {
          gte: new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0')
        }
      }
    });

    const cars = await prisma.car.findMany({
      where: { userId: req.user.userId, isDeleted: false }
    });

    const currentMonth = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
    const carsWithoutMileage = cars.filter(car => {
      const check = mileageStatus.find(m => m.carId === car.id && Math.floor(m.yearMonth / 100) * 100 + (m.yearMonth % 100) === currentMonth);
      return !check;
    });

    if (carsWithoutMileage.length > 0) {
      notifications.push({
        type: 'mileage',
        message: `Не введен пробег за ${new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`,
        count: carsWithoutMileage.length,
        carNames: carsWithoutMileage.map(c => `${c.marka} ${c.model}`).join(', ')
      });
    }

    // 2. Проверка восстановленных авто (можно добавить позже)
    // const restoredCars = await prisma.carRestoreRequest.findMany(...)

    res.json({ 
      success: true, 
      notifications,
      totalCount: notifications.reduce((sum, n) => sum + (n.count || 1), 0)
    });
  } catch (err) {
    console.error('Auto notifications error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// Отметить уведомления как прочитанные
router.post('/notifications/read', async (req: any, res: Response) => {
  try {
    // Здесь можно логировать факт прочтения
    res.json({ success: true });
  } catch (err) {
    console.error('Auto notifications read error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;