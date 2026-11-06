import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Универсальная функция начисления реферального бонуса с логикой Pass-up.
 * Ищет первого платного предка. Если не находит — отправляет в Резервный фонд.
 */
export async function distributeReferralBonus(actionUserId: number, amount: number, description: string) {
  // 1. Находим пользователя, который совершил действие, и берем ID его пригласителя
  const actionUser = await prisma.user.findUnique({ where: { id: actionUserId } });
  if (!actionUser) return { success: false, message: 'Пользователь не найден' };

  let currentUserId = actionUser.referredById;

  // 2. Идем вверх по дереву
  while (currentUserId) {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { wallet: true }
    });

    if (!user) break;

    if (user.isPaidMember) {
      // 🎯 Нашли платного участника! Начисляем ему.
      let walletId = user.wallet?.id;
      if (!walletId) {
        const newWallet = await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
        walletId = newWallet.id;
      }

      await prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } });
      await prisma.transaction.create({
        data: {
          walletId,
          amount,
          type: 'REFERRAL_BONUS',
          description,
          referenceId: `user_${actionUserId}`
        }
      });
      return { success: true, paidTo: user.id, role: 'paid_member' };
    }

    // Не платный, идем еще выше
    currentUserId = user.referredById;
  }

  // 3. Никого не нашли. Отправляем в Резервный фонд экосистемы.
  let systemUser = await prisma.user.findUnique({ where: { phone: 'RESERVE_FUND' } });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: { 
        phone: 'RESERVE_FUND', 
        passwordHash: 'system_internal_hash', 
        role: 'system', 
        isPaidMember: false 
      }
    });
  }

  let wallet = await prisma.wallet.findUnique({ where: { userId: systemUser.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: systemUser.id, balance: 0 } });
  }

  await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
  await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type: 'RESERVE_FUND',
      description: `Резервный фонд (нет платного спонсора для ID:${actionUserId}): ${description}`,
      referenceId: `user_${actionUserId}`
    }
  });

  return { success: true, paidTo: 'RESERVE_FUND', role: 'system' };
}