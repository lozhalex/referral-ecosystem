import { Request, Response, NextFunction } from 'express';

export const requireController = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Требуется авторизация' });
  }

  const role = req.user.role;
  if (role !== 'controller' && role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Доступ запрещен. Требуется роль controller или admin' 
    });
  }

  next();
};