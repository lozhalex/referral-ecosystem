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

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();

// ✅ КРИТИЧНО: доверяем 1 прокси (Nginx). Без этого express-rate-limit падает.
app.set('trust proxy', 1);

// ПУНКТ 16: Строгая настройка CORS
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
    // Разрешаем запросы без origin (Postman, мобильные приложения, серверные вызовы)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // 🔧 ФИКС: НЕ выбрасываем ошибку! Раньше это роняло процесс → crash-loop.
      console.warn(`[CORS] Заблокирован origin: "${origin}"`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// ПУНКТ 16: Базовая защита от CSRF для мутационных запросов
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

// Health check освобождаем от CSRF для удобства мониторинга
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

// =================================================================
// 🕒 CRON-ЗАДАЧА: Ежедневная разморозка бонусов (Пункт 4)
// =================================================================
cron.schedule('0 3 * * *', async () => {
  try {
    const now = new Date();
    const result = await prisma.transaction.updateMany({
      where: {
        status: 'PENDING',
        unlockDate: { lte: now }
      },
      data: {
        status: 'AVAILABLE'
      }
    });
    if (result.count > 0) {
      console.log(`[CRON] ✅ Успешно разморожено ${result.count} транзакций бонусов.`);
    }
  } catch (error) {
    console.error('[CRON] ❌ Ошибка при разморозке бонусов:', error);
  }
});
console.log('✅ Cron-задача разморозки бонусов зарегистрирована');

// =================================================================
// 🆕 GLOBAL ERROR HANDLER — перехватывает все необработанные ошибки
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

// Защита от uncaught exceptions — логируем, но НЕ убиваем процесс
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// =================================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});