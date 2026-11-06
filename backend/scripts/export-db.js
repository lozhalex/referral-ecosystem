const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Начинаю экспорт базы данных...');

  const data = {
    users: await prisma.user.findMany(),
    wallets: await prisma.wallet.findMany(),
    transactions: await prisma.transaction.findMany(),
    events: await prisma.event.findMany(),
    tickets: await prisma.ticket.findMany(),
    eventControllers: await prisma.eventController.findMany(),
    auditLogs: await prisma.treeAuditLog.findMany(),
  };

  // Преобразуем даты в строки для корректного JSON
  const jsonString = JSON.stringify(data, (key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  }, 2);

  const filePath = path.join(__dirname, 'db-backup.json');
  fs.writeFileSync(filePath, jsonString, 'utf8');

  console.log(`✅ Экспорт завершен! Данные сохранены в: ${filePath}`);
  console.log(`📊 Статистика: ${data.users.length} пользователей, ${data.events.length} мероприятий.`);
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Ошибка экспорта:', e);
  process.exit(1);
});