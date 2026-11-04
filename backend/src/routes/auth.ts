import bcrypt from 'bcryptjs';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

// Секретный ключ для JWT (используем тот же, что и в сервере)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

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
// 1. Регистрация
// ==========================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, referred_by_phone } = req.body;

    // 1. Нормализация телефона пользователя
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('8')) cleanPhone = '7' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('7')) cleanPhone = '7' + cleanPhone;
    const formattedPhone = '+' + cleanPhone;

    // 2. АВТОМАТИЧЕСКОЕ ПРИСВАИВАНИЕ: если реферер не указан или пустой, берем системный
    const targetRefPhone = (referred_by_phone && referred_by_phone.trim() !== '') 
      ? referred_by_phone 
      : '+79503278027';

    let cleanRefPhone = targetRefPhone.replace(/\D/g, '');
    if (cleanRefPhone.startsWith('8')) cleanRefPhone = '7' + cleanRefPhone.slice(1);
    if (!cleanRefPhone.startsWith('7')) cleanRefPhone = '7' + cleanRefPhone;
    const formattedRefPhone = '+' + cleanRefPhone;

    // 3. Ищем реферера в базе
    const referrer = await prisma.user.findUnique({ where: { phone: formattedRefPhone } });
    
    // Если реферер найден, запоминаем его ID (если вдруг его нет в БД, будет null, но система не упадет)
    const referredById = referrer ? referrer.id : null;

    // 4. Проверяем, не занят ли номер нового пользователя
    const existingUser = await prisma.user.findUnique({ where: { phone: formattedPhone } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Пользователь с таким номером уже существует' });
    }

    // 5. Хэшируем пароль и создаем пользователя
    const passwordHash = await bcrypt.hash('1234', 10);

    const newUser = await prisma.user.create({
      data: {
        phone: formattedPhone,
        passwordHash,
        referredById, // Присваиваем ID реферера (автоматически или тот, что ввел пользователь)
      },
    });

    // 6. Увеличиваем счетчик рефералов у пригласившего, если он найден
    if (referredById) {
      await prisma.user.update({
        where: { id: referredById },
        data: { referralCount: { increment: 1 } },
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Регистрация успешна. Ваш пароль по умолчанию: 1234', 
      user: { id: newUser.id, phone: newUser.phone } 
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера при регистрации' });
  }
});

// ==========================================
// 2. Вход в систему
// ==========================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('8')) cleanPhone = '7' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('7')) cleanPhone = '7' + cleanPhone;
    const formattedPhone = '+' + cleanPhone;

    const user = await prisma.user.findUnique({ where: { phone: formattedPhone } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Неверный номер телефона или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Неверный номер телефона или пароль' });
    }

    // Генерируем JWT-токен
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: { id: user.id, phone: user.phone, role: user.role },
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера при входе' });
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

    // Проверяем текущий пароль
    if (current_password) {
      const isPasswordValid = await bcrypt.compare(current_password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Неверный текущий пароль' });
      }
    }

    // Хэшируем и сохраняем новый пароль
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ success: true, message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера при смене пароля' });
  }
});

// ==========================================
// 4. Получение данных текущего пользователя (/me)
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
        referrals: {
          select: {
            id: true,
            phone: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    res.json({
      success: true,
      user: {
        ...user,
        registeredAt: user.createdAt, // для совместимости с типами на фронтенде
      },
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера при получении профиля' });
  }
});

export default router;