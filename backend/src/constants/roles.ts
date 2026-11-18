export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CONTROLLER: 'controller',
  SYSTEM: 'system',
  SERVICE_MASTER: 'service_master',
  EVENT_ORGANIZER: 'event_organizer', // 🆕
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Иерархия: кто может менять роли кого
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [ROLES.SUPER_ADMIN]: [ROLES.USER, ROLES.ADMIN, ROLES.CONTROLLER, ROLES.EVENT_ORGANIZER, ROLES.SERVICE_MASTER],
  [ROLES.ADMIN]: [ROLES.USER, ROLES.EVENT_ORGANIZER],
  [ROLES.USER]: [],
  [ROLES.CONTROLLER]: [],
  [ROLES.SYSTEM]: [],
  [ROLES.SERVICE_MASTER]: [],
  [ROLES.EVENT_ORGANIZER]: [],
};

/**
 * Проверяет, есть ли у пользователя хотя бы одна из разрешенных ролей.
 * Теперь поддерживает как массив string[], так и legacy string.
 */
export const hasRole = (userRoles: string[] | string | undefined, allowedRoles: Role[]): boolean => {
  if (!userRoles) return false;
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  return allowedRoles.some(role => rolesArray.includes(role));
};

/**
 * Проверяет бизнес-статус пользователя (платный партнер РЦБ).
 */
export const isPartner = (user: any): boolean => {
  return user?.isRcbPaid === true || (Array.isArray(user?.roles) && user.roles.includes('partner'));
};

/**
 * Проверяет, является ли пользователь основателем.
 */
export const isFounder = (user: any): boolean => {
  return user?.isFounder === true;
};