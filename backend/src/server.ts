import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';

const app = express();

// ИСПРАВЛЕНИЕ 1: Явное приведение к числу, чтобы избежать ошибки TS2769 при компиляции (npx tsc)
const PORT: number = Number(process.env.PORT) || 3000;

// ==========================================
// Middleware
// ==========================================

// CORS: Разрешаем запросы с фронтенда. 
// Для MVP оставляем origin: true (отражает запрос), но в будущем для строгой безопасности 
// лучше указать конкретный домен: origin: 'http://177.177.212.220'
app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rate limiting (Раздел 5.4 Плана: не более 5 попыток в минуту на один IP)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 5, // ИСПРАВЛЕНИЕ 2: 5 запросов вместо 10, согласно ТЗ
  message: {
    success: false,
    message: 'Слишком много попыток. Попробуйте позже.'
  },
  standardHeaders: true, // Возвращает информацию о лимите в заголовках `RateLimit-*`
  legacyHeaders: false, // Отключаем устаревшие заголовки `X-RateLimit-*`
});

// ==========================================
// Маршруты (Endpoints)
// ==========================================

// Health check endpoint (Раздел 5.3 Плана)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Подключаем роуты авторизации с ограничением частоты
app.use('/api/auth', authLimiter, authRoutes);

// ==========================================
// Обработка ошибок и 404
// ==========================================

// Обработка 404 (Маршрут не найден)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

// Глобальный обработчик необработанных ошибок
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Необработанная ошибка сервера:', err);
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера'
  });
});

// ==========================================
// Запуск сервера
// ==========================================

// Запуск сервера на всех интерфейсах (0.0.0.0) для корректной работы с Nginx и локальной сетью
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📱 Локальная сеть: http://0.0.0.0:${PORT}/api/health`);
});

export default app;