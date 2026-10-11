import { Request, Response, NextFunction, RequestHandler } from 'express';
import { jwtService } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';

/*
 Protects routes by verifying the Bearer access token.
 On success, attaches `req.user = { id, role, departmentId }` from the
 JWT payload so downstream handlers can authorise without a DB query.
 */
export const authMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = jwtService.verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      role: payload.role,
      departmentId: payload.departmentId,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message });
    } else {
      res.status(401).json({ message: 'Invalid or expired token' });
    }
  }
};
