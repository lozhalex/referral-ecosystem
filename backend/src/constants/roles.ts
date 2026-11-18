export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CONTROLLER: 'controller',
  SYSTEM: 'system',
  CASHIER: 'cashier',
  SERVICE_MASTER: 'service_master',
  EVENT_ORGANIZER: 'event_organizer',
  PARTNER: 'partner',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

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
 * 🆕 Безопасно превращает данные из БД (строка JSON или legacy-строка) в массив строк.
 */
export const safeParseRoles = (rolesData: any): string[] => {
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

/**
 * 🆕 Проверяет, есть ли у пользователя хотя бы одна из разрешённых ролей.
 */
export const hasRole = (userRoles: any, allowedRoles: Role[]): boolean => {
  const rolesArray = safeParseRoles(userRoles);
  return allowedRoles.some(role => rolesArray.includes(role));
};

/**
 * Проверяет бизнес-статус партнёра.
 */
export const isPartner = (user: any): boolean => {
  return user?.isRcbPaid === true || hasRole(user?.roles, [ROLES.PARTNER]);
};

/**
 * Проверяет, является ли пользователь основателем.
 */
export const isFounder = (user: any): boolean => {
  return user?.isFounder === true;
};