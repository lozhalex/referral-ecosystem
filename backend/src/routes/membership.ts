import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/requireAdmin';
import { authenticateToken } from '../middleware/authenticateToken'; // 👈 ДОБАВЛЕНО: для пользовательских запросов

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// ПОЛЬЗОВАТЕЛЬ: Запрос на становление партнером РЦБ (Пункты 21, 22)
// ==========================================
router.post('/rcb-request', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { rcbId, rcbReferralLink } = req.body;

    // Базовая валидация
    if (!rcbId || typeof rcbId !== 'string' || rcbId.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Некорректный RCB ID (минимум 3 символа)' });
    }
    if (!rcbReferralLink || typeof rcbReferralLink !== 'string' || !rcbReferralLink.includes('rcpay.ru')) {
      return res.status(400).json({ success: false, message: 'Некорректная реферальная ссылка РЦБ' });
    }

    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { referredBy: true } 
    });
    
    if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    if (user.isRcbPaid) {
      return res.status(400).json({ success: false, message: 'Вы уже являетесь подтвержденным партнером РЦБ' });
    }

    // 🌉 ПУНКТ 21: Логика "Умного мостика"
    // Ищем ближайшего бесплатного реферера в цепочке выше
    let currentReferrer = user.referredBy;
    let targetReferrerId: number | null = null;

    // Проходим вверх по дереву (ограничимся 10 уровнями для безопасности)
    let depth = 0;
    while (currentReferrer && depth < 10) {
      if (!currentReferrer.isRcbPaid) {
        targetReferrerId = currentReferrer.id;
        break; // Нашли ближайшего бесплатного, он "под угрозой" потери ветки
      }
      // Если текущий платный, идем к его рефереру (нужен дополнительный запрос, но для MVP хватит проверки прямого)
      // Для полноценного обхода можно расширить include, но пока проверяем прямого реферера
      break; 
    }

    await prisma.$transaction(async (tx) => {
      // 1. Сохраняем черновик данных пользователя для проверки админом
      await tx.user.update({
        where: { id: userId },
        data: {
          rcbId: rcbId.trim(),
          rcbReferralLink: rcbReferralLink.trim()
        }
      });

      // 2. Создаем запрос в таблицу RcbRequest
      await tx.rcbRequest.create({
        data: {
          userId: userId,
          referredById: targetReferrerId || user.referredById, // Привязываем к бесплатному рефереру (или прямому, если все выше платные)
          status: 'PENDING'
        }
      });
    });

    const message = targetReferrerId
      ? 'Заявка отправлена. Ваш реферер получит уведомление о необходимости подтвердить свой статус, чтобы сохранить вас в структуре.'
      : 'Заявка на партнерство отправлена на проверку администратору.';

    res.json({ success: true, message });
  } catch (err) {
    console.error('RCB request error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при создании запроса' });
  }
});

// ==========================================
// АДМИН: Верификация статуса РЦБ (Пункт 23)
// ==========================================
router.post('/:id/rcb-verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const adminId = req.user!.userId;
    const { isRcbPaid, rcbId, rcbReferralLink } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });

    await prisma.$transaction(async (tx) => {
      // 1. Обновляем данные пользователя
      await tx.user.update({
        where: { id: userId },
        data: {
          isRcbPaid: Boolean(isRcbPaid),
          rcbId: rcbId || user.rcbId,
          rcbReferralLink: rcbReferralLink || user.rcbReferralLink
        }
      });

      // 2. Если подтверждаем статус, автоматически закрываем все PENDING запросы, где этот пользователь является реферером
      // (Это значит, что его "подопечные" теперь могут спокойно регистрироваться выше, если нужно, или их запросы одобряются)
      if (isRcbPaid) {
        await tx.rcbRequest.updateMany({
          where: {
            referredById: userId,
            status: 'PENDING'
          },
          data: { status: 'APPROVED' }
        });
      }

      // 3. Пишем в журнал аудита
      await tx.treeAuditLog.create({
        data: {
          adminId,
          targetUserId: userId,
          action: 'RCB_VERIFY',
          oldData: JSON.stringify({ isRcbPaid: user.isRcbPaid, rcbId: user.rcbId }),
          newData: JSON.stringify({ isRcbPaid, rcbId, rcbReferralLink })
        }
      });
    });

    res.json({
      success: true,
      message: `Статус РЦБ пользователя ${user.phone} успешно обновлен.`
    });
  } catch (err) {
    console.error('RCB verify error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при верификации РЦБ' });
  }
});

// ==========================================
// АДМИН: Переключение статуса платного участия (RefPro)
// (Оставляем для совместимости, если используется для внутренней подписки)
// ==========================================
router.post('/:id/toggle', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const adminId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    const newStatus = !user.isPaidMember;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isPaidMember: newStatus }
      });

      await tx.treeAuditLog.create({
        data: {
          adminId,
          targetUserId: userId,
          action: 'MEMBERSHIP_TOGGLE',
          oldData: JSON.stringify({ isPaidMember: user.isPaidMember, phone: user.phone }),
          newData: JSON.stringify({ isPaidMember: newStatus, phone: user.phone })
        }
      });
    });

    res.json({ 
      success: true, 
      message: `Статус пользователя ${user.phone} изменен на: ${newStatus ? 'ПЛАТНЫЙ' : 'БЕСПЛАТНЫЙ'}` 
    });
  } catch (err) {
    console.error('Membership toggle error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при смене статуса' });
  }
});

export default router;