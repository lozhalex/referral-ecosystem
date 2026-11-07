const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs'); // Добавлено для хеширования временных паролей

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

  const tempPasswordsLog = [];

  // 1. Пользователи
  for (const user of data.users) {
    let userToUpsert = { ...user };
    
    // ПУНКТ 15: Если пароль был удален при экспорте, генерируем временный
    if (user.passwordHash === '[REDACTED]' || user.passwordHash === null) {
      const tempPass = Math.random().toString(36).slice(-6).toUpperCase(); // Случайные 6 символов
      userToUpsert.passwordHash = await bcrypt.hash(tempPass, 10);
      tempPasswordsLog.push(`📱 Телефон: ${user.phone} | 🔑 Временный пароль: ${tempPass}`);
    }

    await prisma.user.upsert({
      where: { id: user.id },
      update: userToUpsert,
      create: userToUpsert,
    });
  }
  console.log(`✅ Восстановлено ${data.users.length} пользователей`);

  // Выводим список временных паролей для админа
  if (tempPasswordsLog.length > 0) {
    console.log('\n⚠️ ВНИМАНИЕ! Сгенерированы временные пароли для пользователей без хеша:');
    tempPasswordsLog.forEach(log => console.log(log));
    console.log('Скопируйте эти данные и передайте пользователям для первого входа.\n');
  }

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