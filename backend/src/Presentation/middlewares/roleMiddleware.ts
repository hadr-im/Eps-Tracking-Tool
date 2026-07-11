import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '../../Domain/enums/UserRole';

/*
  Factory that returns a middleware enforcing role-based access control.
  Must be used AFTER `authMiddleware` (requires `req.user` to be set).
 
  @example
  router.delete('/users/:id', authMiddleware, roleMiddleware(UserRole.VP), handler);
 */
export const roleMiddleware = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient role' });
      return;
    }

    next();
  };
};
