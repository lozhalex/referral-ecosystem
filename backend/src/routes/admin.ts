import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/requireAdmin';
import { protectFounder } from '../middleware/protectFounder';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();
const ROOT_PHONE = '+79274204313';

// ==========================================
// 🆕 БЕЗОПАСНЫЙ ПАРСЕР ролей (строка JSON / массив / legacy-строка)
// ==========================================
const safeParseRoles = (rolesData: any): string[] => {
  if (Array.isArray(rolesData)) return rolesData;
  if (typeof rolesData === 'string') {
    try {
      const parsed = JSON.parse(rolesData);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [rolesData];
    }
  }
  return ['user'];
};

// ==========================================
// ПУНКТ 7: Защита от циклических ссылок (Утилита)
// ==========================================
const checkForCycle = async (tx: any, targetUserId: number, newReferredById: number): Promise<boolean> => {
  if (newReferredById === null) return false;
  const queue: number[] = [newReferredById];
  const visited = new Set<number>();
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === targetUserId) return true;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    const children = await tx.user.findMany({
      where: { referredById: currentId },
      select: { id: true }
    });
    for (const child of children) {
      queue.push(child.id);
    }
  }
  return false;
};

// ==========================================
// ПОЛЬЗОВАТЕЛИ
// ==========================================
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const phoneFilter = req.query.phone as string | undefined;
    const where = phoneFilter ? { phone: { contains: phoneFilter.replace(/\D/g, '') } } : {};
    
    const users = await prisma.user.findMany({
      where,
      include: {
        wallet: { select: { balance: true } },
        _count: { select: { referrals: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const result = users.map(u => ({
      id: u.id,
      phone: u.phone,
      roles: safeParseRoles(u.roles), // 🆕 Возвращаем массив для фронтенда
      isPaidMember: u.isPaidMember,
      isFounder: u.isFounder,
      balance: u.wallet?.balance ?? 0,
      referralCount: u._count.referrals,
      createdAt: u.createdAt
    }));

    res.json({ success: true, users: result });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.get('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: { include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } } },
        referredBy: { select: { id: true, phone: true } },
        referrals: { select: { id: true, phone: true, createdAt: true }, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        roles: safeParseRoles(user.roles), // 🆕 Возвращаем массив для фронтенда
        isPaidMember: user.isPaidMember,
        isFounder: user.isFounder,
        createdAt: user.createdAt,
        balance: user.wallet?.balance ?? 0,
        referredBy: user.referredBy,
        referrals: user.referrals,
        transactions: user.wallet?.transactions ?? []
      }
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/users/:id/wallet/adjust', requireAdmin, protectFounder, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { amount, type, description, referenceId } = req.body;

    if (typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({ success: false, message: 'Сумма должна быть числом и не равна 0' });
    }
    if (typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Описание обязательно и минимум 10 символов' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { wallet: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });

    let walletId = user.wallet?.id;
    if (!walletId) {
      const newWallet = await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
      walletId = newWallet.id;
    }

    await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: walletId, ...(amount < 0 ? { balance: { gte: Math.abs(amount) } } : {}) },
        data: { balance: { increment: amount } }
      });

      if (!updatedWallet && amount < 0) {
        throw new Error('Недостаточно средств на балансе для списания');
      }

      await tx.transaction.create({
        data: {
          walletId,
          amount,
          type: type || 'MANUAL_ADJUSTMENT',
          description: description.trim(),
          referenceId: referenceId || null,
          status: 'AVAILABLE'
        }
      });
    });

    console.log(`[ADMIN ACTION] Admin adjusted wallet of user ${userId} by ${amount}.`);
    res.json({ success: true, message: 'Баланс успешно обновлен' });
  } catch (err: any) {
    console.error('Admin wallet adjust error:', err);
    if (err.message === 'Недостаточно средств на балансе для списания') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Ошибка сервера при изменении баланса' });
  }
});

// ==========================================
// 🆕 УПРАВЛЕНИЕ РОЛЯМИ (МАССИВ) И ПАРОЛЯМИ
// ==========================================
router.put('/users/:id/roles', requireAdmin, protectFounder, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { roles } = req.body; // Ожидаем массив string[]
    const adminId = (req as any).user!.userId;

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ success: false, message: 'Должна быть выбрана хотя бы одна роль' });
    }

    const validRoles = ['user', 'admin', 'SUPER_ADMIN', 'cashier', 'controller', 'service_master', 'event_organizer', 'partner'];
    const invalidRoles = roles.filter((r: string) => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ success: false, message: `Недопустимые роли: ${invalidRoles.join(', ')}` });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    if (targetUser.phone === ROOT_PHONE) {
      return res.status(403).json({ success: false, message: 'Нельзя изменить роли корневого администратора' });
    }

    const oldRoles = safeParseRoles(targetUser.roles);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { 
          roles: JSON.stringify(roles),          // 🆕 Исправлено: сохраняем как JSON-строку
          role: roles[0] ?? 'user',              // 🆕 Синхронизируем legacy-поле для совместимости
          tokenVersion: { increment: 1 }
        }
      });
      await tx.treeAuditLog.create({
        data: {
          adminId,
          targetUserId: userId,
          action: 'ROLE_CHANGE',
          oldData: JSON.stringify({ roles: oldRoles }),
          newData: JSON.stringify({ roles, reason: (req.body as any).reason || 'Без причины' })
        }
      });
    });

    res.json({ success: true, message: 'Роли успешно обновлены' });
  } catch (err) {
    console.error('Admin role change error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при смене ролей' });
  }
});

router.post('/users/:id/reset-password', requireAdmin, protectFounder, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const adminId = (req as any).user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    if (user.phone === ROOT_PHONE) {
      return res.status(403).json({ success: false, message: 'Нельзя сбросить пароль корневого администратора' });
    }

    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } }
      });
      await tx.treeAuditLog.create({
        data: {
          adminId,
          targetUserId: userId,
          action: 'PASSWORD_RESET',
          oldData: null,
          newData: JSON.stringify({ message: 'Пароль сброшен администратором' })
        }
      });
    });

    res.json({ success: true, message: 'Пароль успешно сброшен', newPassword });
  } catch (err) {
    console.error('Admin password reset error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера при сбросе пароля' });
  }
});

// ==========================================
// ДЕРЕВО РЕФЕРАЛОВ И АУДИТ
// ==========================================
router.post('/tree/move', requireAdmin, protectFounder, async (req: Request, res: Response) => {
  try {
    const { targetUserId, newReferredById } = req.body;
    const adminId = (req as any).user!.userId;

    if (targetUserId === undefined || newReferredById === undefined) {
      return res.status(400).json({ success: false, message: 'targetUserId и newReferredById обязательны' });
    }
    if (targetUserId === newReferredById) {
      return res.status(400).json({ success: false, message: 'Пользователь не может быть своим собственным реферером' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return res.status(404).json({ success: false, message: 'Целевой пользователь не найден' });

    if (newReferredById !== null) {
      const newReferrer = await prisma.user.findUnique({ where: { id: newReferredById } });
      if (!newReferrer) return res.status(404).json({ success: false, message: 'Новый реферер не найден' });
      
      const willCreateCycle = await checkForCycle(prisma, targetUserId, newReferredById);
      if (willCreateCycle) {
        return res.status(400).json({ success: false, message: 'Ошибка: нельзя переместить пользователя под его собственного потомка.' });
      }
    }

    const oldReferredById = targetUser.referredById;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: targetUserId }, data: { referredById: newReferredById === null ? null : newReferredById } });
      
      if (oldReferredById !== null) {
        await tx.user.update({ where: { id: oldReferredById }, data: { referralCount: { decrement: 1 } } });
      }
      if (newReferredById !== null) {
        await tx.user.update({ where: { id: newReferredById }, data: { referralCount: { increment: 1 } } });
      }

      await tx.treeAuditLog.create({
        data: {
          adminId,
          targetUserId,
          action: 'MOVE',
          oldData: JSON.stringify({ referredById: oldReferredById }),
          newData: JSON.stringify({ referredById: newReferredById })
        }
      });
    });

    res.json({ success: true, message: 'Реферер успешно изменен' });
  } catch (err: any) {
    console.error('Admin tree move error:', err);
    res.status(500).json({ success: false, message: err.message || 'Ошибка сервера' });
  }
});

router.get('/tree/logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.treeAuditLog.findMany({
      include: {
        admin: { select: { id: true, phone: true } },
        targetUser: { select: { id: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      adminPhone: log.admin.phone,
      targetPhone: log.targetUser?.phone || 'ВСЕ',
      action: log.action,
      oldData: log.oldData,
      newData: log.newData,
      createdAt: log.createdAt
    }));

    res.json({ success: true, logs: formattedLogs });
  } catch (err) {
    console.error('Admin tree logs error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.get('/tree/logs/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.treeAuditLog.findMany({
      include: {
        admin: { select: { phone: true } },
        targetUser: { select: { phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const csvRows: string[][] = [['ID', 'Дата', 'Админ', 'Целевой пользователь', 'Действие', 'Старые данные', 'Новые данные']];
    logs.forEach(log => {
      csvRows.push([
        String(log.id),
        log.createdAt.toISOString(),
        log.admin.phone,
        log.targetUser?.phone || 'ВСЕ',
        log.action,
        typeof log.oldData === 'object' ? JSON.stringify(log.oldData) : (log.oldData || ''),
        typeof log.newData === 'object' ? JSON.stringify(log.newData) : (log.newData || '')
      ]);
    });

    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tree_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    console.error('Admin tree export error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.get('/tree/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const treeData = await prisma.user.findMany({
      select: { id: true, phone: true, referredById: true, roles: true }
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=tree_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json(treeData);
  } catch (err) {
    console.error('Admin tree backup error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/tree/import', requireAdmin, async (req: Request, res: Response) => {
  try {
    const treeData = req.body;
    const adminId = (req as any).user!.userId;

    if (!Array.isArray(treeData)) {
      return res.status(400).json({ success: false, message: 'Неверный формат данных' });
    }

    const nodeMap = new Map<number, number | null>();
    treeData.forEach(node => nodeMap.set(node.id, node.referredById));

    for (const node of treeData) {
      let current = node.id;
      const visited = new Set<number>();
      while (current !== null) {
        if (visited.has(current)) {
          return res.status(400).json({ success: false, message: `Обнаружена циклическая ссылка (ID ${current}). Импорт отменен.` });
        }
        visited.add(current);
        current = nodeMap.get(current) ?? null;
      }
    }

    const userIdsInDb = await prisma.user.findMany({ select: { id: true } });
    const validIds = new Set(userIdsInDb.map(u => u.id));

    for (const node of treeData) {
      if (node.referredById !== null && !validIds.has(node.referredById)) {
        return res.status(400).json({ success: false, message: `Ссылка на несуществующего реферера ID ${node.referredById}` });
      }
    }

    await prisma.$transaction(async (tx) => {
      const targetIds = treeData.map(n => n.id);
      const oldReferrers = await tx.user.findMany({ where: { id: { in: targetIds } }, select: { id: true } });
      
      for (const ref of oldReferrers) {
        await tx.user.update({ where: { id: ref.id }, data: { referralCount: 0 } });
      }

      for (const node of treeData) {
        const rolesArr = safeParseRoles(node.roles);
        await tx.user.update({ 
          where: { id: node.id }, 
          data: { 
            referredById: node.referredById,
            roles: JSON.stringify(rolesArr),          // 🆕 Исправлено
            role: rolesArr[0] ?? 'user'               // 🆕 Синхронизируем legacy
          } 
        });
        if (node.referredById !== null) {
          await tx.user.update({ where: { id: node.referredById }, data: { referralCount: { increment: 1 } } });
        }
      }

      await tx.treeAuditLog.create({
        data: {
          adminId,
          targetUserId: null,
          action: 'IMPORT',
          oldData: null,
          newData: JSON.stringify(treeData)
        }
      });
    });

    res.json({ success: true, message: `Дерево успешно восстановлено (${treeData.length} узлов)` });
  } catch (err: any) {
    console.error('Admin tree import error:', err);
    res.status(500).json({ success: false, message: err.message || 'Ошибка сервера' });
  }
});

// ==========================================
// ЗАЯВКИ РЦБ
// ==========================================
router.get('/rcb-requests', requireAdmin, async (req: Request, res: Response) => {
  try {
    const requests = await prisma.user.findMany({
      where: { rcbPaymentRequested: true, isRcbPaid: false },
      select: { id: true, phone: true, rcbId: true, rcbReferralLink: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, requests });
  } catch (err) {
    console.error('Admin rcb requests error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/rcb-requests/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const adminId = (req as any).user!.userId;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      const currentRoles = safeParseRoles(user?.roles);
      if (!currentRoles.includes('partner')) {
        currentRoles.push('partner');
      }

      await tx.user.update({
        where: { id: userId },
        data: { 
          isRcbPaid: true, 
          rcbPaymentRequested: false, 
          roles: JSON.stringify(currentRoles), // 🆕 Исправлено: сохраняем как JSON-строку
          role: currentRoles[0] ?? 'user',     // 🆕 Синхронизируем legacy
          tokenVersion: { increment: 1 }
        }
      });
      
      await tx.treeAuditLog.create({
        data: {
          adminId,
          targetUserId: userId,
          action: 'RCB_APPROVE',
          oldData: JSON.stringify({ isRcbPaid: false, roles: currentRoles }),
          newData: JSON.stringify({ isRcbPaid: true, roles: currentRoles })
        }
      });
    });

    res.json({ success: true, message: 'Пользователь успешно переведен в статус Партнера РЦБ' });
  } catch (err) {
    console.error('Admin rcb approve error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 🆕 МОДУЛЬ AUTOHELPER (Администрирование)
// ==========================================
router.get('/auto/cars', requireAdmin, async (req: Request, res: Response) => {
  try {
    const cars = await prisma.car.findMany({
      where: { isDeleted: false },
      include: { user: { select: { phone: true, id: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, cars });
  } catch (err) {
    console.error('Admin auto cars error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.get('/auto/records', requireAdmin, async (req: Request, res: Response) => {
  try {
    const records = await prisma.serviceRecord.findMany({
      include: {
        user: { select: { phone: true, id: true } },
        car: { select: { marka: true, model: true, gosnomer: true } },
        author: { select: { phone: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, records });
  } catch (err) {
    console.error('Admin auto records error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.put('/auto/records/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const recordId = Number(req.params.id);
    const { date, mileage, category, work, cost, comment } = req.body;
    const adminId = (req as any).user!.userId;

    const originalRecord = await prisma.serviceRecord.findUnique({
      where: { id: recordId },
      include: { user: { select: { id: true } } }
    });

    if (!originalRecord) {
      return res.status(404).json({ success: false, message: 'Запись не найдена' });
    }

    const updatedRecord = await prisma.serviceRecord.update({
      where: { id: recordId },
      data: {
        date: date || originalRecord.date,
        mileage: Number(mileage) || originalRecord.mileage,
        category: category || originalRecord.category,
        work: work || originalRecord.work,
        cost: Number(cost) || originalRecord.cost,
        comment: comment || originalRecord.comment
      }
    });

    await prisma.treeAuditLog.create({
      data: {
        adminId,
        targetUserId: originalRecord.userId,
        action: 'UPDATE_SERVICE_RECORD',
        oldData: JSON.stringify(originalRecord),
        newData: JSON.stringify(updatedRecord)
      }
    });

    res.json({ success: true, record: updatedRecord });
  } catch (err) {
    console.error('Admin auto update record error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.delete('/auto/records/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const recordId = Number(req.params.id);
    const adminId = (req as any).user!.userId;

    const originalRecord = await prisma.serviceRecord.findUnique({
      where: { id: recordId },
      include: { user: { select: { id: true } } }
    });

    if (!originalRecord) {
      return res.status(404).json({ success: false, message: 'Запись не найдена' });
    }

    await prisma.serviceRecord.delete({ where: { id: recordId } });

    await prisma.treeAuditLog.create({
      data: {
        adminId,
        targetUserId: originalRecord.userId,
        action: 'DELETE_SERVICE_RECORD',
        oldData: JSON.stringify(originalRecord),
        newData: 'DELETED'
      }
    });

    res.json({ success: true, message: 'Запись удалена' });
  } catch (err) {
    console.error('Admin auto delete record error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ==========================================
// 🆕 ВИЗУАЛЬНОЕ ДЕРЕВО РЕФЕРАЛОВ
// ==========================================
interface TreeNode {
  id: number;
  phone: string;
  roles: string[];
  referralCount: number;
  totalDescendants: number;
  balance: number;
  isPaidMember: boolean;
  children: TreeNode[];
  hasMore: boolean;
}

const buildTreeNode = async (
  tx: any,
  userId: number,
  currentDepth: number,
  maxDepth: number,
  allUsersMap: Map<number, any>
): Promise<TreeNode> => {
  const user = allUsersMap.get(userId);
  const children = await tx.user.findMany({
    where: { referredById: userId },
    select: { id: true }
  });

  const hasMore = currentDepth >= maxDepth && children.length > 0;
  const childrenToProcess = hasMore ? [] : children;
  const childNodes: TreeNode[] = [];

  for (const child of childrenToProcess) {
    const childNode = await buildTreeNode(tx, child.id, currentDepth + 1, maxDepth, allUsersMap);
    childNodes.push(childNode);
  }

  const countDescendants = async (uid: number): Promise<number> => {
    const kids = await tx.user.findMany({ where: { referredById: uid }, select: { id: true } });
    let count = kids.length;
    for (const kid of kids) {
      count += await countDescendants(kid.id);
    }
    return count;
  };

  const totalDescendants = await countDescendants(userId);

  return {
    id: user.id,
    phone: user.phone,
    roles: safeParseRoles(user.roles), // 🆕 Возвращаем массив
    referralCount: children.length,
    totalDescendants,
    balance: user.wallet?.balance || 0,
    isPaidMember: user.isPaidMember,
    children: childNodes,
    hasMore
  };
};

router.get('/tree/visual', requireAdmin, async (req: Request, res: Response) => {
  try {
    const depth = Number(req.query.depth) || 3;
    const searchPhone = req.query.searchPhone as string | undefined;

    const allUsers = await prisma.user.findMany({
      include: { wallet: { select: { balance: true } } }
    });

    const allUsersMap = new Map<number, any>();
    allUsers.forEach(u => allUsersMap.set(u.id, u));

    if (searchPhone) {
      const targetUser = allUsers.find(u => u.phone.includes(searchPhone.replace(/\D/g, '')));
      if (!targetUser) {
        return res.json({ success: true, tree: [], stats: null, message: 'Пользователь не найден' });
      }

      const path: number[] = [];
      let current = targetUser.id;
      while (current !== null) {
        path.unshift(current);
        const user = allUsersMap.get(current);
        current = user?.referredById || null;
      }

      const rootNodes: TreeNode[] = [];
      for (const rootNodeId of path) {
        const rootNode = await buildTreeNode(prisma, rootNodeId, 0, depth, allUsersMap);
        rootNodes.push(rootNode);
      }

      res.json({ success: true, tree: rootNodes, stats: null });
    } else {
      const rootUsers = allUsers.filter(u => u.referredById === null);
      const rootNodes: TreeNode[] = [];
      for (const root of rootUsers) {
        const rootNode = await buildTreeNode(prisma, root.id, 0, depth, allUsersMap);
        rootNodes.push(rootNode);
      }

      const totalUsers = allUsers.length;
      const paidMembers = allUsers.filter(u => u.isPaidMember).length;
      const founders = allUsers.filter(u => u.isFounder).length;

      const getMaxDepth = async (uid: number): Promise<number> => {
        const kids = await prisma.user.findMany({ where: { referredById: uid }, select: { id: true } });
        if (kids.length === 0) return 0;
        const depths = await Promise.all(kids.map(k => getMaxDepth(k.id)));
        return 1 + Math.max(...depths);
      };

      const depths = await Promise.all(rootUsers.map(r => getMaxDepth(r.id)));
      const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;

      const topByDirect = allUsers
        .map(u => ({ phone: u.phone, count: u.referralCount }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topByTotal = await Promise.all(
        allUsers.map(async u => ({
          phone: u.phone,
          count: await countDescendants(prisma, u.id)
        }))
      );
      topByTotal.sort((a, b) => b.count - a.count);

      const stats = {
        totalUsers,
        maxDepth,
        paidMembers,
        founders,
        topByDirect: topByDirect.slice(0, 5),
        topByTotal: topByTotal.slice(0, 5)
      };

      res.json({ success: true, tree: rootNodes, stats });
    }
  } catch (err) {
    console.error('Admin tree visual error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

const countDescendants = async (tx: any, userId: number): Promise<number> => {
  const kids = await tx.user.findMany({ where: { referredById: userId }, select: { id: true } });
  let count = kids.length;
  for (const kid of kids) {
    count += await countDescendants(tx, kid.id);
  }
  return count;
};

// ==========================================
// 🆕 ЭКСПОРТ/ИМПОРТ ДАННЫХ
// ==========================================
router.get('/export/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        wallet: { include: { transactions: { orderBy: { createdAt: 'desc' } } } },
        referredBy: { select: { id: true, phone: true } },
        referrals: { select: { id: true, phone: true } }
      }
    });

    const exportData = users.map(u => ({
      id: u.id,
      phone: u.phone,
      roles: safeParseRoles(u.roles), // 🆕 Возвращаем массив
      isPaidMember: u.isPaidMember,
      isFounder: u.isFounder,
      balance: u.wallet?.balance || 0,
      transactions: u.wallet?.transactions || [],
      referredById: u.referredById,
      referredByPhone: u.referredBy?.phone || null,
      referralCount: u.referrals.length
    }));

    res.json({ success: true, users: exportData });
  } catch (err) {
    console.error('Export users error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.get('/export/cars', requireAdmin, async (req: Request, res: Response) => {
  try {
    const cars = await prisma.car.findMany({
      where: { isDeleted: false },
      include: {
        user: { select: { id: true, phone: true } },
        records: {
          orderBy: { date: 'desc' },
          include: { author: { select: { phone: true } } }
        }
      }
    });

    const exportData = cars.map(c => ({
      id: c.id,
      userId: c.userId,
      userPhone: c.user.phone,
      marka: c.marka,
      model: c.model,
      year: c.year,
      gosnomer: c.gosnomer,
      vin: c.vin,
      mileage: c.mileage,
      records: c.records
    }));

    res.json({ success: true, cars: exportData });
  } catch (err) {
    console.error('Export cars error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.get('/export/events', requireAdmin, async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        tickets: {
          include: {
            user: { select: { id: true, phone: true } },
            scannedBy: { select: { id: true, phone: true } }
          }
        },
        controllers: {
          include: {
            user: { select: { id: true, phone: true, role: true } }
          }
        }
      },
      orderBy: { eventDate: 'desc' }
    });
    res.json({ success: true, events });
  } catch (err) {
    console.error('Export events error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/import/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userRoles = (req as any).user!.roles;
    if (!safeParseRoles(userRoles).includes('SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Импорт доступен только SUPER_ADMIN' });
    }

    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ success: false, message: 'Неверный формат данных' });
    }

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const userData of users) {
        const rolesArr = Array.isArray(userData.roles) ? userData.roles : safeParseRoles(userData.roles);
        const existingUser = await tx.user.findUnique({ where: { phone: userData.phone } });

        if (existingUser) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              roles: JSON.stringify(rolesArr),          // 🆕 Исправлено
              role: rolesArr[0] ?? existingUser.role,   // 🆕 Синхронизируем legacy
              isPaidMember: userData.isPaidMember ?? existingUser.isPaidMember,
              isFounder: userData.isFounder ?? existingUser.isFounder
            }
          });

          if (userData.balance !== undefined) {
            const wallet = await tx.wallet.findUnique({ where: { userId: existingUser.id } });
            if (wallet) {
              await tx.wallet.update({ where: { id: wallet.id }, data: { balance: userData.balance } });
            } else {
              await tx.wallet.create({ data: { userId: existingUser.id, balance: userData.balance } });
            }
          }
          updated++;
        } else {
          const newUser = await tx.user.create({
            data: {
              phone: userData.phone,
              passwordHash: await bcrypt.hash('123456', 10),
              roles: JSON.stringify(rolesArr.length ? rolesArr : ['user']), // 🆕 Исправлено
              role: rolesArr[0] ?? 'user',                                  // 🆕 Синхронизируем legacy
              isPaidMember: userData.isPaidMember || false,
              isFounder: userData.isFounder || false
            }
          });

          if (userData.balance !== undefined) {
            await tx.wallet.create({ data: { userId: newUser.id, balance: userData.balance } });
          }
          created++;
        }
      }
    });

    res.json({ success: true, message: `Импорт завершён: создано ${created}, обновлено ${updated}` });
  } catch (err) {
    console.error('Import users error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/import/cars', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userRoles = (req as any).user!.roles;
    if (!safeParseRoles(userRoles).includes('SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Импорт доступен только SUPER_ADMIN' });
    }

    const { cars } = req.body;
    if (!Array.isArray(cars)) {
      return res.status(400).json({ success: false, message: 'Неверный формат данных' });
    }

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const carData of cars) {
        const existingCar = await tx.car.findFirst({
          where: { userId: carData.userId, gosnomer: carData.gosnomer }
        });

        if (existingCar) {
          await tx.car.update({
            where: { id: existingCar.id },
            data: {
              marka: carData.marka,
              model: carData.model,
              year: carData.year,
              vin: carData.vin,
              mileage: carData.mileage
            }
          });
          updated++;
        } else {
          await tx.car.create({
            data: {
              userId: carData.userId,
              marka: carData.marka,
              model: carData.model,
              year: carData.year,
              gosnomer: carData.gosnomer,
              vin: carData.vin,
              mileage: carData.mileage
            }
          });
          created++;
        }
      }
    });

    res.json({ success: true, message: `Импорт завершён: создано ${created}, обновлено ${updated}` });
  } catch (err) {
    console.error('Import cars error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

router.post('/import/events', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userRoles = (req as any).user!.roles;
    if (!safeParseRoles(userRoles).includes('SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Импорт доступен только SUPER_ADMIN' });
    }

    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ success: false, message: 'Неверный формат данных' });
    }

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const eventData of events) {
        const existingEvent = await tx.event.findUnique({ where: { id: eventData.id } });

        if (existingEvent) {
          await tx.event.update({
            where: { id: eventData.id },
            data: {
              title: eventData.title,
              description: eventData.description,
              location: eventData.location,
              eventDate: new Date(eventData.eventDate),
              cashbackAmount: eventData.cashbackAmount,
              referrerBonus: eventData.referrerBonus,
              isActive: eventData.isActive,
              posterUrl: eventData.posterUrl
            }
          });
          updated++;
        } else {
          await tx.event.create({
            data: {
              id: eventData.id,
              title: eventData.title,
              description: eventData.description,
              location: eventData.location,
              eventDate: new Date(eventData.eventDate),
              cashbackAmount: eventData.cashbackAmount,
              referrerBonus: eventData.referrerBonus,
              isActive: eventData.isActive,
              posterUrl: eventData.posterUrl
            }
          });
          created++;
        }
      }
    });

    res.json({ success: true, message: `Импорт завершён: создано ${created}, обновлено ${updated}` });
  } catch (err) {
    console.error('Import events error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

export default router;