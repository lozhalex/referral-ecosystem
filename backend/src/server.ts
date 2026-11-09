import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron'; // 👈 ДОБАВЛЕНО: для фоновых задач
import { PrismaClient } from '@prisma/client'; // 👈 ДОБАВЛЕНО: для доступа к БД из крона

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import eventsRoutes from './routes/events';
import ticketsRoutes from './routes/tickets';
import scannerRoutes from './routes/scanner';
import statsRoutes from './routes/stats';
import alertsRoutes from './routes/alerts';
import membershipRoutes from './routes/membership';
import autoRoutes from './routes/auto'; // 👈 ДОБАВЛЕНО

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient(); // 👈 ДОБАВЛЕНО: экземпляр клиента для крон-задачи

// ПУНКТ 16: Строгая настройка CORS (запрет wildcard *)
const allowedOrigins = [
  'http://localhost:5173', // Локальная разработка Vite
  'http://177.177.212.220', // Текущий сервер
  // 'https://your-domain.com' // Раскомментировать при покупке домена
];

app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Не разрешенный источник (CORS)'));
    }
  },
  credentials: true 
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
app.use('/api/auto', autoRoutes); // 👈 ДОБАВЛЕНО

// Health check освобождаем от CSRF для удобства мониторинга
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

// =================================================================
// 🕒 CRON-ЗАДАЧА: Ежедневная разморозка бонусов (Пункт 4)
// Запускается каждый день в 03:00 ночи по времени сервера
// =================================================================
cron.schedule('0 3 * * *', async () => {
  try {
    const now = new Date();
    
    const result = await prisma.transaction.updateMany({
      where: {
        status: 'PENDING',
        unlockDate: { lte: now } // Найти все, где дата разморозки уже наступила
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});