import { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { jwtService } from '../../Infrastructure/container';

/*
  Rate limiting.

  Note on deployment: req.ip is only trustworthy behind a proxy once Express is
  told to trust it (`app.set('trust proxy', 1)`). Without that, every request
  from behind a load balancer looks like it comes from the proxy and shares one
  bucket. Set it to the number of proxies in front of the app — never `true`,
  which lets a client spoof its own IP through X-Forwarded-For.
*/

// Normalised IP key. ipKeyGenerator collapses an IPv6 address to its /64
// subnet, so a single client cannot rotate through addresses it already owns.
function ipKey(req: Request): string {
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

/*
  Keys by the authenticated user, falling back to IP.

  The token is read here rather than relying on req.user, because this limiter
  is mounted globally and runs before any route's authMiddleware. A malformed
  or expired token simply falls through to the IP bucket.
*/
function userOrIpKey(req: Request): string {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      return `user:${jwtService.verifyAccessToken(authHeader.slice(7)).userId}`;
    } catch {
      // Not a usable token — fall through and limit by IP instead.
    }
  }

  return ipKey(req);
}

/*
  General API budget: 100 requests per minute per user.

  Per user rather than global, so one busy VP running dashboards cannot
  throttle the rest of the LC.
*/
export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  keyGenerator: userOrIpKey,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a minute and try again.' },
});

/*
  Credential endpoints: 20 FAILED attempts per 15 minutes per IP.

  Keyed by IP because the whole point is that the caller has no account yet, or
  is guessing at one. Successful requests are not counted, so a legitimate user
  signing in repeatedly is never locked out — only wrong passwords and wrong VP
  setup codes consume the budget.

  This is what stops the VP setup code from being brute-forced: without it,
  the general 100/minute limit would still allow thousands of guesses an hour.
*/
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  keyGenerator: ipKey,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Too many attempts. Please wait 15 minutes before trying again.',
  },
});
