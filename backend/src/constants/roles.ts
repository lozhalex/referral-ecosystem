export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CONTROLLER: 'controller',
  SYSTEM: 'system',
  CASHIER: 'cashier',
  SERVICE_MASTER: 'service_master',
  EVENT_ORGANIZER: 'event_organizer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Иерархия: кто может менять роли кого
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [ROLES.SUPER_ADMIN]: [ROLES.USER, ROLES.ADMIN, ROLES.CONTROLLER, ROLES.CASHIER, ROLES.SERVICE_MASTER, ROLES.EVENT_ORGANIZER],
  [ROLES.ADMIN]: [ROLES.USER, ROLES.EVENT_ORGANIZER],
  [ROLES.USER]: [],
  [ROLES.CONTROLLER]: [],
  [ROLES.SYSTEM]: [],
  [ROLES.CASHIER]: [],
  [ROLES.SERVICE_MASTER]: [],
  [ROLES.EVENT_ORGANIZER]: [],
};

export const hasRole = (userRole: string | undefined, allowedRoles: Role[]): boolean => {
  return userRole ? (allowedRoles as string[]).includes(userRole) : false;
};

export const isPartner = (user: any): boolean => {
  return user?.isRcbPaid === true || user?.role === 'partner';
};

export const isFounder = (user: any): boolean => {
  return user?.isFounder === true;
};