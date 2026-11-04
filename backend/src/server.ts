import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';

const app = express();

// ИСПРАВЛЕНИЕ: Явное приведение к числу, чтобы избежать ошибки TS2769 при компиляции
const PORT: number = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder']
}));

app.use(express.json());

// Rate limiting (5 попыток в минуту согласно ТЗ, раздел 5.4)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Слишком много попыток. Попробуйте позже.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Подключаем роуты авторизации с ограничением частоты
app.use('/api/auth', authLimiter, authRoutes);

// Обработка 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

// Обработка ошибок
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера'
  });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Сервер запущен на порту ' + PORT);
  console.log('📊 Health check: http://localhost:' + PORT + '/api/health');
  console.log('📱 Локальная сеть: http://0.0.0.0:' + PORT + '/api/health');
});

export default app;