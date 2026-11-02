import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  const rootPhone = process.env.ROOT_USER_PHONE || '+79503278027';
  const adminPhone = process.env.SUPER_ADMIN_PHONE || '+79274204313';
  const defaultPassword = '1234';
  
  // Хешируем пароль 1234
  const hashedPassword = await hashPassword(defaultPassword);

  console.log('🌱 Начинаем инициализацию базы данных...');

  // 1. Создаем Супер-админа (Вас) - вершина дерева, без реферера
  const adminUser = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {},
    create: {
      phone: adminPhone,
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN',
      referralCount: 0,
    },
  });
  console.log(`✅ Супер-админ создан: ${adminUser.phone} (Роль: ${adminUser.role}, вершина дерева)`);

  // 2. Создаем корневого пользователя (Root), реферером делаем Супер-админа
  const rootUser = await prisma.user.upsert({
    where: { phone: rootPhone },
    update: {},
    create: {
      phone: rootPhone,
      passwordHash: hashedPassword,
      role: 'USER', // Роль USER, но номер защищен на уровне API
      referredById: adminUser.id,
      referralCount: 0,
    },
  });
  console.log(`✅ Корневой пользователь создан: ${rootUser.phone} (реферер: ${adminUser.phone})`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при инициализации БД:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });