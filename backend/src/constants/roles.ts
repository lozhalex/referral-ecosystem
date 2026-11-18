// Типы системных ролей (легко расширять в будущем)
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CONTROLLER: 'controller',
  SYSTEM: 'system',
  CASHIER: 'cashier',
  SERVICE_MASTER: 'service_master',
  EVENT_ORGANIZER: 'event_organizer', // 🆕
  PARTNER: 'partner', // 🆕
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Иерархия: кто может менять роли кого
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [ROLES.SUPER_ADMIN]: [ROLES.USER, ROLES.ADMIN, ROLES.CONTROLLER, ROLES.CASHIER, ROLES.SERVICE_MASTER, ROLES.EVENT_ORGANIZER, ROLES.PARTNER],
  [ROLES.ADMIN]: [ROLES.USER, ROLES.EVENT_ORGANIZER],
  [ROLES.USER]: [],
  [ROLES.CONTROLLER]: [],
  [ROLES.SYSTEM]: [],
  [ROLES.CASHIER]: [],
  [ROLES.SERVICE_MASTER]: [],
  [ROLES.EVENT_ORGANIZER]: [],
  [ROLES.PARTNER]: [],
};

/**
 * 🆕 Проверяет, есть ли у пользователя хотя бы одна из разрешённых ролей.
 * Принимает: массив string[] (из Prisma Json), JSON-строку или legacy string.
 */
export const hasRole = (userRoles: any, allowedRoles: Role[]): boolean => {
  if (!userRoles) return false;

  let rolesArray: string[] = [];

  if (Array.isArray(userRoles)) {
    rolesArray = userRoles;
  } else if (typeof userRoles === 'string') {
    // Попробуем распарсить как JSON (если пришла строка из SQLite Json-поля)
    try {
      const parsed = JSON.parse(userRoles);
      rolesArray = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Старый формат — просто строка
      rolesArray = [userRoles];
    }
  } else {
    rolesArray = [ROLES.USER];
  }

  return allowedRoles.some(role => rolesArray.includes(role));
};

/**
 * 🆕 Проверяет бизнес-статус партнёра (платный РЦБ или роль partner в массиве).
 */
export const isPartner = (user: any): boolean => {
  return user?.isRcbPaid === true || hasRole(user?.roles, [ROLES.PARTNER]);
};

/**
 * 🆕 Проверяет, является ли пользователь основателем.
 */
export const isFounder = (user: any): boolean => {
  return user?.isFounder === true;
};