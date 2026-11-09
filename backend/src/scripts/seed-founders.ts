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
}

async function main() {
  console.log('🚀 Запуск скрипта восстановления основателей...');

  if (!fs.existsSync(foundersPath)) {
    console.error('❌ Файл founders.json не найден по пути:', foundersPath);
    process.exit(1);
  }

  const founders: FounderData[] = JSON.parse(fs.readFileSync(foundersPath, 'utf-8'));
  const tempPassword = 'Founder2026!'; 
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  for (const founder of founders) {
    // 1. Ищем реферера внутри нашей системы (кто пригласил в RefPro)
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

    // 2. Upsert (Обновить или Создать) с сохранением данных РЦБ
    const user = await prisma.user.upsert({
      where: { phone: founder.phone },
      update: {
        isFounder: true,
        role: founder.role,
        referredById: referredById,
        rcbId: founder.rcbId || undefined,
        rcbReferralLink: founder.rcbReferralLink || undefined,
        isRcbPaid: true // Раз это основатели из РЦБ, логично сразу пометить их как оплаченных/подтвержденных
      },
      create: {
        phone: founder.phone,
        passwordHash: passwordHash,
        role: founder.role,
        isFounder: true,
        referredById: referredById,
        rcbId: founder.rcbId || undefined,
        rcbReferralLink: founder.rcbReferralLink || undefined,
        isRcbPaid: true
      }
    });

    console.log(`✅ Обработан: ${user.phone} (ID: ${user.id}, РЦБ: ${user.rcbId || 'нет'}, Founder: ${user.isFounder})`);
  }

  console.log('🎉 Все основатели успешно синхронизированы с базой данных!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });