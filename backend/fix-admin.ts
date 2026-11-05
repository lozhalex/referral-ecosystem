import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRole() {
  try {
    const user = await prisma.user.update({
      where: { phone: '+79503278027' },
      data: { role: 'admin' } // Принудительно ставим нижний регистр
    });
    console.log(`✅ Роль пользователя ${user.phone} успешно изменена на '${user.role}'`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRole();