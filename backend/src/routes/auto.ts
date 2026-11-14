import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';
import { sendPushToUser } from '../utils/pushSender';
import { v4 as uuidv4 } from 'uuid';

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
      orderBy: { date: 'desc' },
      include: {
        author: { select: { phone: true } }
      }
    });
    res.json({ success: true, records });
  } catch (err) {
    console.error('Auto journal get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/journal', async (req: any, res: Response) => {
  try {
    const { carId, date, mileage, category, subcat, work, cost, comment, source, authorId } = req.body;
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
        comment: comment || '',
        source: source || 'owner',
        authorId: authorId || req.user.userId
      }
    });

    if (carId && mileage && (!source || source === 'owner')) {
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
router.get('/mileage-checks/:carId', async (req: any, res: Response) => {
  try {
    const carId = Number(req.params.carId);
    const checks = await prisma.mileageCheck.findMany({
      where: { carId, userId: req.user.userId },
      orderBy: { yearMonth: 'asc' }
    });
    res.json({ success: true, checks });
  } catch (err) {
    console.error('Auto mileage checks get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/mileage-check', async (req: any, res: Response) => {
  try {
    const { carId, km } = req.body;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const lastCheck = await prisma.mileageCheck.findFirst({
      where: { carId: Number(carId), userId: req.user.userId },
      orderBy: { yearMonth: 'desc' }
    });

    if (lastCheck && Number(km) < lastCheck.km) {
      return res.status(400).json({
        success: false,
        code: 'MILEAGE_DECREASED',
        lastMileage: lastCheck.km,
        message: `Пробег уменьшился. Последний зафиксированный: ${lastCheck.km} км`
      });
    }

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
      prisma.car.findMany({ where: { userId: req.user.userId, isDeleted: false } }),
      prisma.serviceRecord.findMany({ where: { userId: req.user.userId, ...(carId && { carId }) }, orderBy: { date: 'desc' } }),
      prisma.serviceInterval.findUnique({ where: { userId: req.user.userId } }),
      prisma.mileageCheck.findMany({ where: { userId: req.user.userId }, orderBy: { yearMonth: 'desc' } })
    ]);

    const intervals = intervalRow ? JSON.parse(intervalRow.data) : {};
    res.json({ success: true, cars, records, intervals, mileageChecks });
  } catch (err) {
    console.error('Auto dashboard error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 6. НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ (🆕 Обновлено)
// ==========================================
router.get('/settings', async (req: any, res: Response) => {
  try {
    const settings = await prisma.userAutoSettings.findUnique({
      where: { userId: req.user.userId }
    });
    res.json({
      success: true,
      settings: settings || { mileageReminderTime: '09:00', disableOsagoReminder: false }
    });
  } catch (err) {
    console.error('Auto settings get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/settings', async (req: any, res: Response) => {
  try {
    const { mileageReminderTime, disableOsagoReminder } = req.body;
    await prisma.userAutoSettings.upsert({
      where: { userId: req.user.userId },
      update: { 
        mileageReminderTime: mileageReminderTime || '09:00',
        disableOsagoReminder: typeof disableOsagoReminder === 'boolean' ? disableOsagoReminder : false
      },
      create: {
        userId: req.user.userId,
        mileageReminderTime: mileageReminderTime || '09:00',
        disableOsagoReminder: typeof disableOsagoReminder === 'boolean' ? disableOsagoReminder : false
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Auto settings save error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 7. УВЕДОМЛЕНИЯ (🆕 Обновлено: фильтрация ОСАГО)
// ==========================================
router.get('/notifications', async (req: any, res: Response) => {
  try {
    const notifications: any[] = [];
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 🆕 Проверяем настройки пользователя
    const settings = await prisma.userAutoSettings.findUnique({
      where: { userId: req.user.userId }
    });
    const disableOsago = settings?.disableOsagoReminder || false;

    const cars = await prisma.car.findMany({ where: { userId: req.user.userId, isDeleted: false } });
    
    const mileageStatus = await prisma.mileageCheck.findMany({
      where: { userId: req.user.userId, yearMonth: currentYearMonth }
    });
    const checkedCarIds = new Set(mileageStatus.map(m => m.carId));
    const carsWithoutMileage = cars.filter(car => !checkedCarIds.has(car.id));

    if (carsWithoutMileage.length > 0) {
      notifications.push({
        type: 'mileage',
        message: `Не введен пробег за ${now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`,
        count: carsWithoutMileage.length,
        carNames: carsWithoutMileage.map(c => `${c.marka} ${c.model}`).join(', ')
      });
    }

    const records = await prisma.serviceRecord.findMany({ where: { userId: req.user.userId } });
    const intervalRow = await prisma.serviceInterval.findUnique({ where: { userId: req.user.userId } });
    const intervals = intervalRow ? JSON.parse(intervalRow.data) : {};
    
    const byCategory: Record<string, any> = {};
    for (const rec of records) {
      if (!byCategory[rec.category] || rec.date > byCategory[rec.category].date) {
        byCategory[rec.category] = rec;
      }
    }

    const timeBasedCats = ['brake_fluid', 'antifreeze', 'ac_recharge', 'osago'];
    for (const catKey of timeBasedCats) {
      const lastRec = byCategory[catKey];
      if (!lastRec) continue;
      
      const intervalMonths = intervals[catKey] || 12;
      const lastDate = new Date(lastRec.date);
      const nextDueDate = new Date(lastDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);

      if (nextDueDate <= currentMonthEnd) {
        notifications.push({
          type: 'service',
          message: `${catKey === 'osago' ? 'ОСАГО' : getCategoryName(catKey)} истекает в этом месяце`,
          count: 1,
          category: catKey
        });
      }
    }

    // 🆕 Фильтруем уведомления по ОСАГО, если пользователь их отключил
    const filteredNotifications = disableOsago
      ? notifications.filter(n => n.type !== 'service' || n.category !== 'osago')
      : notifications;

    res.json({
      success: true,
      notifications: filteredNotifications,
      totalCount: filteredNotifications.reduce((sum, n) => sum + (n.count || 1), 0)
    });
  } catch (err) {
    console.error('Auto notifications error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/notifications/read', async (req: any, res: Response) => {
  try {
    const { types } = req.body;
    console.log('Notifications marked as read:', types);
    res.json({ success: true });
  } catch (err) {
    console.error('Auto notifications read error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 8. PUSH-УВЕДОМЛЕНИЯ (Инфраструктура)
// ==========================================
router.get('/push/vapid-public-key', async (req: any, res: Response) => {
  try {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  } catch (err) {
    console.error('VAPID key error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/push/subscribe', async (req: any, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ success: false, message: 'Неверные данные подписки' });
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint: endpoint },
      update: { userId: req.user.userId, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: req.user.userId, endpoint: endpoint, p256dh: keys.p256dh, auth: keys.auth }
    });
    res.json({ success: true, message: 'Подписка на уведомления сохранена' });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 9. 🆕 QR-ДОСТУП ДЛЯ СЕРВИСМЕНОВ
// ==========================================
router.post('/service-access/qr/generate', async (req: any, res: Response) => {
  try {
    const { carId } = req.body;
    if (!carId) return res.status(400).json({ success: false, message: 'Не указан carId' });

    const car = await prisma.car.findFirst({
      where: { id: Number(carId), userId: req.user.userId, isDeleted: false }
    });
    if (!car) return res.status(404).json({ success: false, message: 'Автомобиль не найден' });

    await prisma.serviceAccessQR.updateMany({
      where: { carId: Number(carId), clientId: req.user.userId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() }
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const qr = await prisma.serviceAccessQR.create({
      data: { token, carId: Number(carId), clientId: req.user.userId, expiresAt }
    });

    res.json({
      success: true,
      token: qr.token,
      expiresAt: qr.expiresAt,
      carInfo: { marka: car.marka, model: car.model, gosnomer: car.gosnomer }
    });
  } catch (err) {
    console.error('QR generate error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/service-access/qr/validate', async (req: any, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Не указан токен' });
    if (req.user.role !== 'service_master') {
      return res.status(403).json({ success: false, message: 'Доступ запрещён: требуется роль сервисмена' });
    }

    const qr = await prisma.serviceAccessQR.findUnique({
      where: { token },
      include: { car: true, client: { select: { id: true, phone: true } } }
    });

    if (!qr) return res.status(404).json({ success: false, message: 'QR-код не найден' });
    if (qr.expiresAt < new Date()) return res.status(410).json({ success: false, message: 'QR-код истёк' });

    const recentRecords = await prisma.serviceRecord.findMany({
      where: { carId: qr.carId, userId: qr.clientId },
      orderBy: { date: 'desc' },
      take: 3,
      include: { author: { select: { phone: true } } }
    });

    res.json({
      success: true,
      car: qr.car,
      client: { id: qr.clientId, phone: qr.client.phone },
      recentRecords,
      qrId: qr.id
    });
  } catch (err) {
    console.error('QR validate error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/service-access/qr/record', async (req: any, res: Response) => {
  try {
    const { token, date, category, work, cost, comment } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Не указан токен' });
    if (req.user.role !== 'service_master') {
      return res.status(403).json({ success: false, message: 'Доступ запрещён' });
    }

    const qr = await prisma.serviceAccessQR.findUnique({ where: { token }, include: { car: true, client: true } });
    if (!qr) return res.status(404).json({ success: false, message: 'QR-код не найден' });
    if (qr.expiresAt < new Date()) return res.status(410).json({ success: false, message: 'QR-код истёк' });

    const record = await prisma.serviceRecord.create({
      data: {
        userId: qr.clientId,
        carId: qr.carId,
        date: date || new Date().toISOString().split('T')[0],
        mileage: qr.car.mileage,
        category: category || '',
        work: work || '',
        cost: Number(cost) || 0,
        comment: comment || '',
        source: 'service_master',
        authorId: req.user.userId
      }
    });

    await sendPushToUser(qr.clientId, 'Помощник автомобилиста', 'Мастер внёс запись в журнал ТО');
    res.json({ success: true, record });
  } catch (err) {
    console.error('QR record error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/service-access/qr/revoke', async (req: any, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Не указан токен' });

    const qr = await prisma.serviceAccessQR.findUnique({ where: { token } });
    if (!qr || qr.clientId !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'QR-код не найден' });
    }

    await prisma.serviceAccessQR.update({
      where: { id: qr.id },
      data: { expiresAt: new Date() }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('QR revoke error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// Вспомогательные функции
// ==========================================
function getCategoryName(key: string): string {
  const names: Record<string, string> = {
    brake_fluid: 'Тормозная жидкость',
    antifreeze: 'Антифриз',
    ac_recharge: 'Кондиционер',
    osago: 'ОСАГО'
  };
  return names[key] || key;
}

export default router;