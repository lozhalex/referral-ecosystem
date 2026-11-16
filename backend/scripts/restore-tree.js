// backend/scripts/restore-tree.js
// Одноразовый скрипт восстановления пользователей из бэкапа дерева.
// Запуск: node scripts/restore-tree.js (из папки backend)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const backupPath = path.join(__dirname, 'tree_backup_2026-11-14.json');
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Файл бэкапа не найден:', backupPath);
    process.exit(1);
  }

  const tree = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  console.log(`Загружено узлов: ${tree.length}`);

  const passwordHash = bcrypt.hashSync('123456', 10);

  await prisma.$transaction(async (tx) => {
    // 1. Развязываем self-relation рефералов
    await tx.user.updateMany({ data: { referredById: null } });

    // 2. Удаляем зависимые таблицы (порядок важен из-за FK)
    await tx.transaction.deleteMany({});
    await tx.wallet.deleteMany({});
    await tx.treeAuditLog.deleteMany({});
    await tx.ticket.deleteMany({});
    await tx.eventController.deleteMany({});
    await tx.rcbRequest.deleteMany({});
    await tx.pushSubscription.deleteMany({});
    await tx.serviceAccessQR.deleteMany({});
    await tx.mileageCheck.deleteMany({});
    await tx.serviceRecord.deleteMany({});
    await tx.serviceInterval.deleteMany({});
    await tx.master.deleteMany({});
    await tx.userAutoSettings.deleteMany({});
    await tx.car.deleteMany({});
    await tx.user.deleteMany({});

    // 3. Вставляем пользователей с оригинальными id
    for (const node of tree) {
      await tx.user.create({
        data: {
          id: node.id,
          phone: node.phone,
          passwordHash,
          role: node.id === 1 ? 'SUPER_ADMIN' : node.id === 2 ? 'admin' : 'user',
          referredById: node.referredById,
          wallet: { create: { balance: 0 } }
        }
      });
    }

    // 4. Пересчитываем referralCount
    for (const node of tree) {
      if (node.referredById !== null) {
        await tx.user.update({
          where: { id: node.referredById },
          data: { referralCount: { increment: 1 } }
        });
      }
    }
  });

  const count = await prisma.user.count();
  console.log(`✅ Восстановлено пользователей: ${count}`);

  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'admin'] } },
    select: { id: true, phone: true, role: true }
  });
  console.log('Админы:', admins);
}

main()
  .catch((e) => { console.error('❌ Ошибка:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());