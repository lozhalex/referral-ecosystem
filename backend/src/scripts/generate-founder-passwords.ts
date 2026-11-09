import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const foundersPath = path.join(__dirname, '../../data/founders.json');

interface FounderData {
  phone: string;
}

// Функция для генерации случайного 6-значного кода
const generateSixDigitCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Функция для формирования ссылки в зависимости от мессенджера
const getMessengerLink = (phone: string, method: string | null) => {
  const cleanPhone = phone.replace(/\D/g, ''); // Удаляем все кроме цифр
  switch (method?.toLowerCase()) {
    case 'telegram':
      return `https://t.me/+${cleanPhone}`;
    case 'whatsapp':
      return `https://wa.me/${cleanPhone}`;
    case 'max':
      return `https://max.me/+${cleanPhone}`; // Или другая ссылка для Max
    case 'sms':
    default:
      return `SMS на номер ${phone}`;
  }
};

async function main() {
  console.log('🔑 Запуск генерации паролей для основателей...\n');

  if (!fs.existsSync(foundersPath)) {
    console.error('❌ Файл founders.json не найден по пути:', foundersPath);
    process.exit(1);
  }

  const founders: FounderData[] = JSON.parse(fs.readFileSync(foundersPath, 'utf-8'));
  const results: any[] = [];

  for (const founder of founders) {
    // Ищем пользователя в базе
    const user = await prisma.user.findUnique({
      where: { phone: founder.phone },
      select: { id: true, phone: true, preferredContact: true }
    });

    if (!user) {
      console.warn(`⚠️ Пользователь ${founder.phone} не найден в базе данных. Пропускаем.`);
      continue;
    }

    // Генерируем 6-значный код
    const tempPassword = generateSixDigitCode();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Обновляем пароль в БД и инкрементируем версию токена (на всякий случай)
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash,
        tokenVersion: { increment: 1 } 
      }
    });

    // Собираем данные для таблицы
    results.push({
      Телефон: user.phone,
      'Временный пароль': tempPassword,
      'Канал связи': user.preferredContact || 'sms',
      'Ссылка для отправки': getMessengerLink(user.phone, user.preferredContact)
    });
  }

  // Выводим красивую таблицу в консоль
  if (results.length > 0) {
    console.table(results);
    console.log(`\n✅ Успешно сгенерировано и сохранено паролей: ${results.length}`);
    console.log('💡 Скопируйте таблицу выше и разошлите пароли основателям через указанные мессенджеры.');
  } else {
    console.log('⚠️ Не удалось найти ни одного основателя в базе данных.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });