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

/*
  Identity of a Google account that has authenticated but has NO user row yet.
  Carried across the two steps of Google signup. Grants nothing on its own.
*/
export interface SetupTokenPayload {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

// Marks setup tokens as a distinct token kind so one can never be replayed as
// an access token, even if the signing keys were ever misconfigured to match.
const SETUP_TOKEN_AUDIENCE = 'signup-completion';

// Helpers

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/*
  Setup tokens are signed with their own key. Set JWT_SETUP_SECRET in
  production; otherwise it is derived from the refresh secret so the flow works
  without new configuration. Never JWT_ACCESS_SECRET — a token signed with that
  key IS an access token, which would turn this into a second way in.
*/
function setupSecret(): string {
  return process.env['JWT_SETUP_SECRET'] ?? `${requireEnv('JWT_REFRESH_SECRET')}::signup-completion`;
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

  // Setup tokens (Google signup, step 1 -> step 2)

  /*
   Short-lived: it only has to survive the user picking a department and a role.
   Carries no userId and no role, because at this point neither exists.
  */
  generateSetupToken(payload: SetupTokenPayload): string {
    return jwt.sign(payload, setupSecret(), {
      expiresIn: '15m',
      audience: SETUP_TOKEN_AUDIENCE,
    });
  }

  verifySetupToken(token: string): SetupTokenPayload {
    const decoded = jwt.verify(token, setupSecret(), {
      audience: SETUP_TOKEN_AUDIENCE,
    }) as SetupTokenPayload & _JwtPayload;

    return {
      googleId: decoded.googleId,
      email: decoded.email,
      fullName: decoded.fullName,
      avatarUrl: decoded.avatarUrl ?? null,
    };
  }
}
