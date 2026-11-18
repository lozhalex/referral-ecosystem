export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CONTROLLER: 'controller',
  SYSTEM: 'system',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Иерархия: кто может менять роли кого
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [ROLES.SUPER_ADMIN]: [ROLES.USER, ROLES.ADMIN, ROLES.CONTROLLER], // Может менять всех, кроме SUPER_ADMIN
  [ROLES.ADMIN]: [ROLES.USER], // Может менять только обычных пользователей
  [ROLES.USER]: [], // Не может менять ничьи роли
  [ROLES.CONTROLLER]: [], // Не может менять роли
  [ROLES.SYSTEM]: [], // Системная роль, не меняется
};