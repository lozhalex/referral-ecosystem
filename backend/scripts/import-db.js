const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, 'db-backup.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ Файл db-backup.json не найден! Сначала выполните экспорт.');
    process.exit(1);
  }

  console.log('📥 Начинаю импорт базы данных...');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);

  // 1. Пользователи (upsert сохраняет связи referredById)
  for (const user of data.users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }
  console.log(`✅ Восстановлено ${data.users.length} пользователей`);

  // 2. Кошельки
  for (const wallet of data.wallets) {
    await prisma.wallet.upsert({
      where: { id: wallet.id },
      update: wallet,
      create: wallet,
    });
  }
  console.log(`✅ Восстановлено ${data.wallets.length} кошельков`);

  // 3. Транзакции
  for (const tx of data.transactions) {
    await prisma.transaction.upsert({
      where: { id: tx.id },
      update: tx,
      create: tx,
    });
  }
  console.log(`✅ Восстановлено ${data.transactions.length} транзакций`);

  // 4. Мероприятия
  for (const event of data.events) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: event,
      create: event,
    });
  }
  console.log(`✅ Восстановлено ${data.events.length} мероприятий`);

  // 5. Билеты
  for (const ticket of data.tickets) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: ticket,
      create: ticket,
    });
  }
  console.log(`✅ Восстановлено ${data.tickets.length} билетов`);

  // 6. Контролеры
  for (const ec of data.eventControllers) {
    await prisma.eventController.upsert({
      where: { id: ec.id },
      update: ec,
      create: ec,
    });
  }

  // 7. Журнал аудита
  for (const log of data.auditLogs) {
    await prisma.treeAuditLog.upsert({
      where: { id: log.id },
      update: log,
      create: log,
    });
  }
  console.log(`✅ Восстановлено ${data.auditLogs.length} записей аудита`);

  console.log('🎉 Импорт базы данных успешно завершен!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Ошибка импорта:', e);
  process.exit(1);
});