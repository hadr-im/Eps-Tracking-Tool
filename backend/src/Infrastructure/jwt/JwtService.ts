import jwt, { SignOptions, JwtPayload as _JwtPayload } from 'jsonwebtoken';
import { UserRole } from '../../Domain/enums/UserRole';

// Payload shape embedded in every token 

/*
 The data the middleware can read from the access token without hitting the DB.
 Keep it lean: only what route guards legitimately need.
 */
export interface TokenPayload {
  userId: string;
  role: UserRole;
  departmentId: string | null;
  isDispatcher: boolean;
}

// Helpers 

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

// Service 

/*
 Stateless JWT utility.
 Access tokens:  short-lived (default 15m), used for API authorisation.
 Refresh tokens:  long-lived (default 7d), stored as bcrypt hashes in the DB.
 */
export class JwtService {
  // Access tokens 

  generateAccessToken(payload: TokenPayload): string {
    const secret = requireEnv('JWT_ACCESS_SECRET');
    const expiresIn = (process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m') as SignOptions['expiresIn'];

    return jwt.sign(payload, secret, { expiresIn });
  }

  verifyAccessToken(token: string): TokenPayload {
    const secret = requireEnv('JWT_ACCESS_SECRET');
    const decoded = jwt.verify(token, secret) as TokenPayload & _JwtPayload;

    return {
      userId: decoded.userId,
      role: decoded.role,
      departmentId: decoded.departmentId,
      isDispatcher: decoded.isDispatcher ?? false,
    };
  }

  // Refresh tokens 

  generateRefreshToken(payload: TokenPayload): string {
    const secret = requireEnv('JWT_REFRESH_SECRET');
    const expiresIn = (process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d') as SignOptions['expiresIn'];

    return jwt.sign(payload, secret, { expiresIn });
  }

  verifyRefreshToken(token: string): TokenPayload {
    const secret = requireEnv('JWT_REFRESH_SECRET');
    const decoded = jwt.verify(token, secret) as TokenPayload & _JwtPayload;

    return {
      userId: decoded.userId,
      role: decoded.role,
      departmentId: decoded.departmentId,
      isDispatcher: decoded.isDispatcher ?? false,
    };
  }
}
