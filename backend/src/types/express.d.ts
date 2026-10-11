import { UserRole } from '../../Domain/enums/UserRole';

/*
 Extends Express's built-in Request type so `req.user` is typed after
 the auth middleware runs. Passport also reads from Express.User for OAuth.
 */
declare global {
  namespace Express {
    interface User {
      id: string;
      role: UserRole;
      departmentId: string | null;
    }
  }
}

export {};
