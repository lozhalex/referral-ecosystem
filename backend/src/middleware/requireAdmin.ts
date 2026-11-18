import { Request, Response, NextFunction } from 'express';
import { hasRole, ROLES } from '../constants/roles';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const roles = (req as any).user?.roles;

  if (!hasRole(roles, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещён. Требуются права администратора.'
    });
  }

  next();
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const roles = (req as any).user?.roles;

  if (!hasRole(roles, [ROLES.SUPER_ADMIN])) {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещён. Требуются права супер-администратора.'
    });
  }

  next();
};