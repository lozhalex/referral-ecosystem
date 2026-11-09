import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const foundersPath = path.join(__dirname, '../../data/founders.json');

interface FounderData {
  phone: string;
  role: string;
  referredByPhone: string | null;
  rcbId: string | null;
  rcbReferralLink: string | null;
  isSmart: boolean;
}

async function main() {
  console.log('🚀 Запуск скрипта синхронизации основателей (СМАРТ/ФРИ)...');

  if (!fs.existsSync(foundersPath)) {
    console.error('❌ Файл founders.json не найден по пути:', foundersPath);
    process.exit(1);
  }

  const founders: FounderData[] = JSON.parse(fs.readFileSync(foundersPath, 'utf-8'));
  const tempPassword = 'Founder2026!'; 
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  for (const founder of founders) {
    // 1. Ищем реферера внутри нашей системы
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

    // 2. Определяем статусы на основе поля isSmart
    const isSmart = founder.isSmart === true;
    
    // Если это корневой админ, оставляем SUPER_ADMIN, иначе для СМАРТ ставим 'partner'
    let finalRole = founder.role;
    if (isSmart && founder.role !== 'SUPER_ADMIN') {
      finalRole = 'partner';
    }

    // 3. Upsert (Обновить или Создать)
    const user = await prisma.user.upsert({
      where: { phone: founder.phone },
      update: {
        isFounder: true,
        role: finalRole,
        referredById: referredById,
        rcbId: founder.rcbId || undefined,
        rcbReferralLink: founder.rcbReferralLink || undefined,
        // И СМАРТ, и ФРИ уже зарегистрированы в РЦБ (Шаг 2 выполнен)
        isRcbRegisteredFree: true, 
        // Оплату 1990 прошли только СМАРТ
        isRcbPaid: isSmart, 
        rcbPaymentRequested: false // Сбрасываем флаг заявки, так как статус уже известен
      },
      create: {
        phone: founder.phone,
        passwordHash: passwordHash,
        role: finalRole,
        isFounder: true,
        referredById: referredById,
        rcbId: founder.rcbId || undefined,
        rcbReferralLink: founder.rcbReferralLink || undefined,
        isRcbRegisteredFree: true,
        isRcbPaid: isSmart,
        rcbPaymentRequested: false
      }
    });

    const statusText = isSmart ? 'СМАРТ (Партнер)' : 'ФРИ';
    console.log(`✅ Обработан: ${user.phone} | Статус: ${statusText} | Роль: ${user.role}`);
  }

  console.log('🎉 Синхронизация статусов основателей успешно завершена!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });