import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import eventsRoutes from './routes/events';
import ticketsRoutes from './routes/tickets';
import scannerRoutes from './routes/scanner';
import statsRoutes from './routes/stats';
import alertsRoutes from './routes/alerts';
import membershipRoutes from './routes/membership';
import rcbRoutes from './routes/rcb';
import autoRoutes from './routes/auto';
import apartmentsRoutes from './routes/apartments';
import metersRoutes from './routes/meters';
import { sendPushToUser } from './utils/pushSender';

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();

app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://177.177.212.220',
  'http://booomerang.ru',
  'https://booomerang.ru',
  'http://www.booomerang.ru',
  'https://www.booomerang.ru'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Заблокирован origin: "${origin}"`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      return res.status(403).json({
        success: false,
        message: 'CSRF validation failed: Missing required header'
      });
    }
  }
  next();
};
app.use(csrfProtection);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Слишком много попыток. Попробуйте позже.' }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/membership', membershipRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin/alerts', alertsRoutes);
app.use('/api/rcb', rcbRoutes);
app.use('/api/auto', autoRoutes);
app.use('/api/apartments', apartmentsRoutes);
app.use('/api/meters', metersRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

// =================================================================
// 🕒 CRON 1: Ежедневная разморозка бонусов (Пункт 4)
// =================================================================
cron.schedule('0 3 * * *', async () => {
  try {
    const now = new Date();
    const result = await prisma.transaction.updateMany({
      where: {
        status: 'PENDING',
        unlockDate: { lte: now }
      },
      data: { status: 'AVAILABLE' }
    });
    if (result.count > 0) {
      console.log(`[CRON] ✅ Успешно разморожено ${result.count} транзакций бонусов.`);
    }
  } catch (error) {
    console.error('[CRON] ❌ Ошибка при разморозке бонусов:', error);
  }
});
console.log('✅ Cron-задача разморозки бонусов зарегистрирована (ежедневно в 3:00)');

// =================================================================
// 🕒 CRON 2: Напоминания ЖКХ о подаче показаний (ежедневно в 9:00)
// =================================================================
cron.schedule('0 9 * * *', async () => {
  try {
    const today = new Date();
    const todayDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const apartments = await prisma.apartment.findMany({
      where: { isActive: true },
      include: {
        meters: { where: { isActive: true }, select: { id: true } }
      }
    });

    let sentCount = 0;

    for (const apt of apartments) {
      // Пропускаем квартиры без активных счетчиков
      if (apt.meters.length === 0) continue;

      const billingDay = apt.billingDay;
      let daysUntil: number;

      if (billingDay > todayDay) {
        daysUntil = billingDay - todayDay;
      } else {
        daysUntil = (daysInMonth - todayDay) + billingDay;
      }

      // Напоминаем ровно за 3 дня до billingDay
      if (daysUntil === 3) {
        await sendPushToUser(
          apt.userId,
          '📊 Счетчики ЖКХ',
          `Через 3 дня нужно подать показания по квартире "${apt.comment}". Не забудьте!`
        );
        sentCount++;
        console.log(`[CRON ЖКХ] ✅ Напоминание отправлено пользователю ${apt.userId} (квартира "${apt.comment}", billingDay=${billingDay})`);
      }
    }

    if (sentCount > 0) {
      console.log(`[CRON ЖКХ] 📬 Всего отправлено напоминаний: ${sentCount}`);
    } else {
      console.log('[CRON ЖКХ] ℹ️ Сегодня напоминаний не требуется');
    }
  } catch (error) {
    console.error('[CRON ЖКХ] ❌ Ошибка:', error);
  }
});
console.log('✅ Cron-задача напоминаний ЖКХ зарегистрирована (ежедневно в 9:00)');

// =================================================================
// 🆕 GLOBAL ERROR HANDLER
// =================================================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err?.message || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера'
  });
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});