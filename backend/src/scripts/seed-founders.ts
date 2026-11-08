import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Путь к файлу founders.json
const foundersPath = path.join(__dirname, '../../data/founders.json');

interface FounderData {
  phone: string;
  role: string;
  referredByPhone: string | null;
}

async function main() {
  console.log('🚀 Запуск скрипта восстановления основателей...');

  if (!fs.existsSync(foundersPath)) {
    console.error('❌ Файл founders.json не найден по пути:', foundersPath);
    process.exit(1);
  }

  const founders: FounderData[] = JSON.parse(fs.readFileSync(foundersPath, 'utf-8'));
  
  // Временный пароль для созданных основателей (если их еще нет в базе)
  const tempPassword = 'Founder2026!'; 
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  for (const founder of founders) {
    // 1. Ищем реферера (если указан)
    let referredById: number | null = null;
    if (founder.referredByPhone) {
      const referrer = await prisma.user.findUnique({
        where: { phone: founder.referredByPhone }
      });
      if (referrer) {
        referredById = referrer.id;
      } else {
        console.warn(`⚠️ Реферер ${founder.referredByPhone} не найден в БД для ${founder.phone}`);
      }
    }

    // 2. Upsert (Обновить или Создать)
    const user = await prisma.user.upsert({
      where: { phone: founder.phone },
      update: {
        isFounder: true, // Гарантируем флаг
        role: founder.role,
        referredById: referredById // Обновляем связь, если нужно
      },
      create: {
        phone: founder.phone,
        passwordHash: passwordHash,
        role: founder.role,
        isFounder: true,
        referredById: referredById
      }
    });

    console.log(`✅ Обработан: ${user.phone} (ID: ${user.id}, Founder: ${user.isFounder})`);
  }

  console.log('🎉 Все основатели успешно синхронизированы!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });