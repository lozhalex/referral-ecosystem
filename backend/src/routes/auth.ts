import bcrypt from 'bcryptjs';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '30d'; // PROJECT_PLAN п. 3.3
const ROOT_PHONE = '+79503278027'; // PROJECT_PLAN п. 3.1
const DEFAULT_PASSWORD = '1234'; // PROJECT_PLAN п. 3.1

// ==========================================
// Утилита: нормализация телефона к +7XXXXXXXXXX
// Возвращает null, если номер некорректный
// ==========================================
const normalizePhone = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;

  let digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;

  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;

  if (digits.length !== 11) return null;
  return '+' + digits;
};

const signToken = (user: { id: number; phone: string; role: string }) =>
  jwt.sign({ userId: user.id, phone: user.phone, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

// ==========================================
// Middleware для проверки JWT-токена
// ==========================================
const authenticateToken = (req: any, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Неверный или истекший токен' });
    }
    req.user = user;
    next();
  });
};

// ==========================================
// 1. Регистрация (PROJECT_PLAN п. 3.4.А)
// ==========================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, referred_by_phone } = req.body;
    console.log('📩 Регистрация, входные данные:', { phone, referred_by_phone });

    // Шаг 1. Нормализация номера пользователя
    const formattedPhone = normalizePhone(phone);
    if (!formattedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный номер телефона. Формат: +7XXXXXXXXXX',
      });
    }

    // Шаг 2. Защита корневого пользователя
    if (formattedPhone === ROOT_PHONE) {
      return res.status(400).json({
        success: false,
        message: 'Регистрация с этим номером невозможна',
      });
    }

    // Шаг 3. Проверка уникальности
    const existingUser = await prisma.user.findUnique({ where: { phone: formattedPhone } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким номером уже существует',
      });
    }

    // Шаг 4. Определение реферера: пустой -> корневой
    const normalizedRef = normalizePhone(referred_by_phone);
    const referrerPhone = normalizedRef || ROOT_PHONE;
    const isFallbackToRoot = !normalizedRef;

    console.log('🔍 Ищем пригласителя:', referrerPhone, isFallbackToRoot ? '(по умолчанию)' : '(указан пользователем)');

    if (referrerPhone === formattedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя указать свой собственный номер в качестве пригласителя',
      });
    }

    // Шаг 5. Пригласитель обязан существовать
    const referrer = await prisma.user.findUnique({ where: { phone: referrerPhone } });
    if (!referrer) {
      if (isFallbackToRoot) {
        console.error('❌ КРИТИЧНО: корневой пользователь не найден в БД:', ROOT_PHONE);
        return res.status(500).json({
          success: false,
          message: 'Системная ошибка: корневой пользователь не найден. Обратитесь к администратору',
        });
      }
      return res.status(400).json({ success: false, message: 'Пригласитель не найден' });
    }

    console.log('✅ Пригласитель найден, ID:', referrer.id);

    // Шаг 6. Создание пользователя + инкремент счётчика одной транзакцией
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: formattedPhone,
          passwordHash,
          referredById: referrer.id,
        },
      });

      await tx.user.update({
        where: { id: referrer.id },
        data: { referralCount: { increment: 1 } },
      });

      return created;
    });

    // Шаг 7. JWT на 30 дней (авто-вход после регистрации)
    const token = signToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Регистрация успешна. Ваш временный пароль: 1234',
      token,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        role: newUser.role,
        referralCount: newUser.referralCount,
        referredBy: { id: referrer.id, phone: referrer.phone },
      },
    });
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    return res.status(500).json({ success: false, message: 'Ошибка сервера при регистрации' });
  }
});

// ==========================================
// 2. Вход в систему (PROJECT_PLAN п. 3.4.Б)
// ==========================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    const formattedPhone = normalizePhone(phone);
    const genericError = 'Неверный номер телефона или пароль';

    if (!formattedPhone || typeof password !== 'string') {
      return res.status(401).json({ success: false, message: genericError });
    }

    const user = await prisma.user.findUnique({ where: { phone: formattedPhone } });
    if (!user) {
      return res.status(401).json({ success: false, message: genericError });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: genericError });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: { id: user.id, phone: user.phone, role: user.role },
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    return res.status(500).json({ success: false, message: 'Ошибка сервера при входе' });
  }
});

// ==========================================
// 3. Смена пароля
// ==========================================
router.post('/change-password', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { current_password, new_password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    // Защита корневого пользователя (PROJECT_PLAN п. 5.4)
    if (user.phone === ROOT_PHONE) {
      return res.status(403).json({
        success: false,
        message: 'Смена пароля корневого пользователя через публичный API запрещена',
      });
    }

    if (typeof new_password !== 'string' || new_password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Новый пароль должен содержать не менее 4 символов',
      });
    }

    if (current_password) {
      const isPasswordValid = await bcrypt.compare(current_password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Неверный текущий пароль' });
      }
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return res.json({ success: true, message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    return res.status(500).json({ success: false, message: 'Ошибка сервера при смене пароля' });
  }
});

// ==========================================
// 4. Профиль текущего пользователя (PROJECT_PLAN п. 3.4.В)
// ==========================================
router.get('/me', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        role: true,
        referralCount: true,
        createdAt: true,
        // 👇 ДОБАВЛЕНО: получение баланса кошелька 👇
        wallet: {
          select: {
            balance: true,
          },
        },
        // 👆 КОНЕЦ ДОБАВЛЕННОГО БЛОКА 👆
        referredBy: {
          select: { id: true, phone: true },
        },
        referrals: {
          select: { id: true, phone: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    return res.json({
      success: true,
      user: {
        ...user,
        registeredAt: user.createdAt, // совместимость с типами фронтенда
      },
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    return res.status(500).json({ success: false, message: 'Ошибка сервера при получении профиля' });
  }
});

export default router;