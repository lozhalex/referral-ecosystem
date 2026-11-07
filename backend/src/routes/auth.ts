import bcrypt from 'bcryptjs';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/authenticateToken'; // 👈 Импортируем из middleware

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '30d';
const ROOT_PHONE = '+79503278027';
const DEFAULT_PASSWORD = '1234';

// ==========================================
// RATE LIMITING (Пункт 8: Защита от брутфорса)
// ==========================================
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Слишком много попыток входа. Пожалуйста, попробуйте снова через 1 минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Слишком много попыток регистрации с этого IP. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// Утилита: нормализация телефона
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

// 👈 ДОБАВЛЕНО: tokenVersion в подпись токена (Пункт 6)
const signToken = (user: { id: number; phone: string; role: string; tokenVersion: number }) =>
  jwt.sign(
    { userId: user.id, phone: user.phone, role: user.role, version: user.tokenVersion }, 
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

// ==========================================
// 1. Регистрация (Пункт 13: Защита от самоприглашения)
// ==========================================
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, referred_by_phone } = req.body;

    const formattedPhone = normalizePhone(phone);
    if (!formattedPhone) {
      return res.status(400).json({ success: false, message: 'Некорректный номер телефона. Формат: +7XXXXXXXXXX' });
    }

    if (formattedPhone === ROOT_PHONE) {
      return res.status(400).json({ success: false, message: 'Регистрация с этим номером невозможна' });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone: formattedPhone } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Пользователь с таким номером уже существует' });
    }

    const normalizedRef = normalizePhone(referred_by_phone);
    const referrerPhone = normalizedRef || ROOT_PHONE;
    const isFallbackToRoot = !normalizedRef;

    // 👈 ПУНКТ 13: Запрет самоприглашения
    if (referrerPhone === formattedPhone) {
      return res.status(400).json({ success: false, message: 'Нельзя указать свой собственный номер в качестве пригласителя' });
    }

    const referrer = await prisma.user.findUnique({ where: { phone: referrerPhone } });
    if (!referrer) {
      if (isFallbackToRoot) {
        return res.status(500).json({ success: false, message: 'Системная ошибка: корневой пользователь не найден.' });
      }
      return res.status(400).json({ success: false, message: 'Пригласитель не найден' });
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: formattedPhone,
          passwordHash,
          referredById: referrer.id,
          // tokenVersion по умолчанию равен 1 (задано в schema.prisma)
        },
      });

      await tx.user.update({
        where: { id: referrer.id },
        data: { referralCount: { increment: 1 } },
      });

      return created;
    });

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
// 2. Вход в систему
// ==========================================
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
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
// 3. Смена пароля (Пункт 6: Инкремент tokenVersion)
// ==========================================
router.post('/change-password', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { current_password, new_password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    if (user.phone === ROOT_PHONE) {
      return res.status(403).json({ success: false, message: 'Смена пароля корневого пользователя через публичный API запрещена' });
    }

    if (typeof new_password !== 'string' || new_password.length < 4) {
      return res.status(400).json({ success: false, message: 'Новый пароль должен содержать не менее 4 символов' });
    }

    if (current_password) {
      const isPasswordValid = await bcrypt.compare(current_password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Неверный текущий пароль' });
      }
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // 👈 ПУНКТ 6: Увеличиваем версию токена, чтобы все старые сессии этого пользователя стали недействительными
    await prisma.user.update({
      where: { id: userId },
      data: { 
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 } 
      },
    });

    return res.json({ success: true, message: 'Пароль успешно изменен. Вам потребуется войти в систему заново.' });
  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    return res.status(500).json({ success: false, message: 'Ошибка сервера при смене пароля' });
  }
});

// ==========================================
// 4. Профиль текущего пользователя
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
        wallet: { select: { balance: true } },
        referredBy: { select: { id: true, phone: true } },
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
      user: { ...user, registeredAt: user.createdAt },
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    return res.status(500).json({ success: false, message: 'Ошибка сервера при получении профиля' });
  }
});

export default router;