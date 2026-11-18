export type SystemRole = 'user' | 'cashier' | 'controller' | 'admin' | 'SUPER_ADMIN' | 'service_master' | 'event_organizer';

/**
 * Проверяет, есть ли у пользователя одна из разрешенных системных ролей.
 * Теперь поддерживает массив string[] (из БД) и legacy string.
 */
export const hasRole = (userRoles: string[] | string | undefined, allowedRoles: SystemRole[]): boolean => {
  if (!userRoles) return false;
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  return allowedRoles.some(role => rolesArray.includes(role));
};

/**
 * Проверяет бизнес-статус пользователя (платный партнер РЦБ или бесплатный).
 */
export const isPartner = (user: any): boolean => {
  return user?.isRcbPaid === true || (Array.isArray(user?.roles) && user.roles.includes('partner'));
};

/**
 * Проверяет, является ли пользователь основателем (для UI-подсветки или скрытия кнопок)
 */
export const isFounder = (user: any): boolean => {
  return user?.isFounder === true;
};