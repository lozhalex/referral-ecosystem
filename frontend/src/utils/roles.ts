// Типы системных ролей (легко расширять в будущем)
export type SystemRole = 'user' | 'cashier' | 'controller' | 'admin' | 'SUPER_ADMIN';

/**
 * Проверяет, есть ли у пользователя одна из разрешенных системных ролей.
 * Пример: hasRole(user.role, ['admin', 'SUPER_ADMIN'])
 */
export const hasRole = (userRole: string | undefined, allowedRoles: SystemRole[]): boolean => {
  return userRole ? (allowedRoles as string[]).includes(userRole) : false;
};

/**
 * Проверяет бизнес-статус пользователя (платный партнер РЦБ или бесплатный).
 * Это НЕ системная роль, а признак монетизации.
 */
export const isPartner = (user: any): boolean => {
  return user?.isRcbPaid === true || user?.role === 'partner'; // fallback для совместимости
};

/**
 * Проверяет, является ли пользователь основателем (для UI-подсветки или скрытия кнопок)
 */
export const isFounder = (user: any): boolean => {
  return user?.isFounder === true;
};