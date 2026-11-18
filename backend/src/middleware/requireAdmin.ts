import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.role;

  if (role !== 'admin' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещён. Требуются права администратора.'
    });
  }

  next();
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.role;

  if (role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещён. Требуются права супер-администратора.'
    });
  }

  next();
};