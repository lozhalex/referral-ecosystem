import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticateToken';
import { sendPushToUser } from '../utils/pushSender';

const router = Router();
const prisma = new PrismaClient();
router.use(authenticateToken);

const VALID_TYPES = ['HWS', 'GWS', 'DRINKING_WATER', 'ELECTRICITY', 'GAS', 'HEAT'];
const VALID_TARIFFS = ['SINGLE', 'TWO_TARIFF', 'THREE_TARIFF'];
const LOCK_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function currentPeriodKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftPeriodKey(key: string, monthsBack: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 - monthsBack, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
async function unlockAchievement(
  userId: number, code: string, title: string, description: string, icon: string, module: string
) {
  const ach = await prisma.achievement.upsert({
    where: { code },
    update: { title, description, icon, module },
    create: { code, title, description, icon, module }
  });
  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: ach.id } }
  });
  if (!existing) {
    await prisma.userAchievement.create({ data: { userId, achievementId: ach.id } });
  }
}

router.get('/', async (req: any, res: Response) => {
  try {
    const apartmentId = req.query.apartmentId ? Number(req.query.apartmentId) : undefined;
    const periodKey = currentPeriodKey();
    const meters = await prisma.meter.findMany({
      where: { userId: req.user.userId, isActive: true, ...(apartmentId && { apartmentId }) },
      orderBy: { sortOrder: 'asc' }
    });
    const currentReadings = await prisma.meterReading.findMany({
      where: { meterId: { in: meters.map(m => m.id) }, periodKey }
    });
    const submittedIds = new Set(currentReadings.map(r => r.meterId));
    const result = meters.map(m => ({ ...m, isSubmittedCurrent: submittedIds.has(m.id) }));
    res.json({ success: true, meters: result, periodKey });
  } catch (err) {
    console.error('Zhkh meters get error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/', async (req: any, res: Response) => {
  try {
    const { apartmentId, type, tariffType, comment, serialNumber, initialReading, nextVerificationDate } = req.body;
    if (!apartmentId) return res.status(400).json({ success: false, message: 'Не указана квартира' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ success: false, message: 'Неверный тип ресурса' });
    if (!comment || String(comment).trim() === '') return res.status(400).json({ success: false, message: 'Укажите комментарий' });
    if (!serialNumber || String(serialNumber).trim() === '') return res.status(400).json({ success: false, message: 'Укажите серийный номер' });

    const apt = await prisma.apartment.findFirst({ where: { id: Number(apartmentId), userId: req.user.userId, isActive: true } });
    if (!apt) return res.status(404).json({ success: false, message: 'Квартира не найдена' });

    const maxSort = await prisma.meter.aggregate({ where: { userId: req.user.userId, isActive: true }, _max: { sortOrder: true } });
    const meter = await prisma.meter.create({
      data: {
        userId: req.user.userId, apartmentId: Number(apartmentId), type,
        tariffType: VALID_TARIFFS.includes(tariffType) ? tariffType : 'SINGLE',
        comment: String(comment).slice(0, 100), serialNumber: String(serialNumber),
        initialReading: Number(initialReading) || 0,
        nextVerificationDate: nextVerificationDate ? new Date(nextVerificationDate) : null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1
      }
    });
    await unlockAchievement(req.user.userId, 'FIRST_METER', 'Первый счетчик', 'Добавлен первый счетчик', '🥉', 'zhkh');
    res.json({ success: true, meter });
  } catch (err) {
    console.error('Zhkh meter create error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.put('/:id', async (req: any, res: Response) => {
  try {
    const { comment, serialNumber, nextVerificationDate, tariffType, type } = req.body;
    const updateData: any = {};
    if (comment !== undefined) updateData.comment = String(comment).slice(0, 100);
    if (serialNumber !== undefined) updateData.serialNumber = String(serialNumber);
    if (tariffType !== undefined && VALID_TARIFFS.includes(tariffType)) updateData.tariffType = tariffType;
    if (type !== undefined && VALID_TYPES.includes(type)) updateData.type = type;
    if (nextVerificationDate !== undefined) updateData.nextVerificationDate = nextVerificationDate ? new Date(nextVerificationDate) : null;

    await prisma.meter.updateMany({ where: { id: Number(req.params.id), userId: req.user.userId, isActive: true }, data: updateData });
    res.json({ success: true });
  } catch (err) {
    console.error('Zhkh meter update error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/:id/delete', async (req: any, res: Response) => {
  try {
    await prisma.meter.updateMany({ where: { id: Number(req.params.id), userId: req.user.userId }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) {
    console.error('Zhkh meter delete error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.patch('/reorder', async (req: any, res: Response) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ success: false, message: 'Неверный формат' });
    await prisma.$transaction(order.map((o: any) => prisma.meter.updateMany({ where: { id: Number(o.id), userId: req.user.userId, isActive: true }, data: { sortOrder: Number(o.sortOrder) } })));
    res.json({ success: true });
  } catch (err) {
    console.error('Zhkh meter reorder error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/:id/readings', async (req: any, res: Response) => {
  try {
    const meterId = Number(req.params.id);
    const { t1, t2, t3, usedOcr, mlConsent, photoUrl, ocrT1 } = req.body;
    const meter = await prisma.meter.findFirst({ where: { id: meterId, userId: req.user.userId, isActive: true } });
    if (!meter) return res.status(404).json({ success: false, message: 'Счетчик не найден' });

    const periodKey = currentPeriodKey();
    const last = await prisma.meterReading.findFirst({ where: { meterId }, orderBy: { periodKey: 'desc' } });
    const prevT1 = last ? last.t1 : meter.initialReading;
    const newT1 = Number(t1);
    
    if (isNaN(newT1)) return res.status(400).json({ success: false, message: 'Неверное значение' });
    if (newT1 < prevT1) return res.status(400).json({ success: false, code: 'READING_DECREASED', prevT1, message: `Новое показание не может быть меньше предыдущего (${prevT1})` });

    const data = {
      meterId, periodKey, prevT1, t1: newT1,
      t2: meter.tariffType !== 'SINGLE' ? Number(t2) || null : null,
      t3: meter.tariffType === 'THREE_TARIFF' ? Number(t3) || null : null,
      usedOcr: !!usedOcr, mlConsent: !!mlConsent, photoUrl: photoUrl || null,
      ocrT1: ocrT1 !== undefined ? Number(ocrT1) : null, status: 'confirmed', lockedAt: new Date(Date.now() + LOCK_WINDOW_MS)
    };

    await prisma.meterReading.upsert({
      where: { meterId_periodKey: { meterId, periodKey } },
      update: { ...data, meterId: undefined, periodKey: undefined } as any,
      create: data
    });

    await unlockAchievement(req.user.userId, 'FIRST_READING', 'Первые показания', 'Внесены первые показания', '📝', 'zhkh');
    const keys = [periodKey, shiftPeriodKey(periodKey, 1), shiftPeriodKey(periodKey, 2)];
    const monthsWithReadings = await prisma.meterReading.findMany({ where: { meter: { userId: req.user.userId }, periodKey: { in: keys } }, select: { periodKey: true } });
    if (new Set(monthsWithReadings.map(r => r.periodKey)).size >= 3) {
      await unlockAchievement(req.user.userId, 'RESPONSIBLE_3', 'Ответственный', 'Показания 3 месяца подряд', '🔥', 'zhkh');
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Zhkh reading create error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.put('/:id/readings/:rid', async (req: any, res: Response) => {
  try {
    const meterId = Number(req.params.id);
    const readingId = Number(req.params.rid);
    const { t1, t2, t3 } = req.body;
    const meter = await prisma.meter.findFirst({ where: { id: meterId, userId: req.user.userId, isActive: true } });
    if (!meter) return res.status(404).json({ success: false, message: 'Счетчик не найден' });
    const reading = await prisma.meterReading.findFirst({ where: { id: readingId, meterId } });
    if (!reading) return res.status(404).json({ success: false, message: 'Показание не найдено' });
    if (reading.lockedAt && new Date() > reading.lockedAt) return res.status(403).json({ success: false, code: 'READONLY', message: 'Окно редактирования истекло.' });

    const newT1 = Number(t1);
    if (newT1 < reading.prevT1) return res.status(400).json({ success: false, code: 'READING_DECREASED', prevT1: reading.prevT1, message: `Новое показание не может быть меньше предыдущего (${reading.prevT1})` });

    await prisma.meterReading.update({
      where: { id: readingId },
      data: { t1: newT1, t2: meter.tariffType !== 'SINGLE' ? Number(t2) || null : null, t3: meter.tariffType === 'THREE_TARIFF' ? Number(t3) || null : null }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Zhkh reading update error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.get('/history', async (req: any, res: Response) => {
  try {
    const { type, apartmentId } = req.query;
    const readings = await prisma.meterReading.findMany({
      where: { meter: { userId: req.user.userId, isActive: true, ...(type && VALID_TYPES.includes(String(type)) && { type: String(type) }), ...(apartmentId && { apartmentId: Number(apartmentId) }) } },
      orderBy: { periodKey: 'desc' },
      include: { meter: true }
    });
    res.json({ success: true, readings });
  } catch (err) {
    console.error('Zhkh history error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/report-exported', async (req: any, res: Response) => {
  try {
    await unlockAchievement(req.user.userId, 'REPORT_EXPORTED', 'Аналитик', 'Выгружен отчет для УК', '📊', 'zhkh');
    res.json({ success: true });
  } catch (err) {
    console.error('Zhkh report export error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 9. ПРЯМОЙ ТЕСТ НАПОМИНАНИЙ (для вызова с сервера через curl)
// ==========================================
router.post('/test-reminder', async (req: any, res: Response) => {
  try {
    // Для теста с localhost разрешаем передать userId напрямую, чтобы обойти JWT
    const targetUserId = req.body.userId || 1; 

    const apt = await prisma.apartment.findFirst({
      where: { userId: targetUserId, isActive: true },
      include: { meters: { where: { isActive: true }, select: { id: true } } }
    });

    if (!apt) {
      return res.status(400).json({ success: false, message: 'У пользователя нет активных квартир' });
    }
    if (apt.meters.length === 0) {
      return res.status(400).json({ success: false, message: 'В квартире нет активных счетчиков' });
    }

    await sendPushToUser(
      targetUserId,
      '📊 Счетчики ЖКХ (ПРЯМОЙ ТЕСТ)',
      `Это тестовое уведомление для квартиры "${apt.comment}". Если вы это видите на устройстве, Push работает идеально!`
    );

    console.log(`[TEST] ✅ Уведомление успешно отправлено пользователю ${targetUserId}`);
    res.json({ success: true, message: 'Тестовое уведомление отправлено' });
  } catch (err) {
    console.error('Zhkh test reminder error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;