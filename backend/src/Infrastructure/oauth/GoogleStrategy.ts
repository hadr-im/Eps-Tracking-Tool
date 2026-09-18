import passport from 'passport';
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from 'passport-google-oauth20';

// Google profile extracted from OAuth response 

/*
 Lean object passed to the next middleware after Google authentication.
 The actual find-or-create DB logic lives in the Application use-case layer
 (GoogleAuthUseCase) the strategy's only job is to extract profile data.
 */
export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  // URL of the user's Google profile picture. May be undefined.
  avatar: string | undefined;
}

// Strategy registration

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/*
 Registers the Passport Google OAuth 2.0 strategy.
 
 Call this once at application startup (before any routes are mounted).
 The callback extracts the raw Google profile into a typed {@link GoogleProfile}
 and passes it to `done`, no DB calls happen here.
 */
export function configureGoogleStrategy(): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: requireEnv('GOOGLE_CLIENT_ID'),
        clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
        callbackURL: requireEnv('GOOGLE_CALLBACK_URL'),
        scope: ['profile', 'email'],
      },
      (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
      ) => {
        try {
          const primaryEmail = profile.emails?.[0]?.value;

          if (!primaryEmail) {
            return done(new Error('No email returned from Google profile'));
          }

          const googleProfile: GoogleProfile = {
            googleId: profile.id,
            email: primaryEmail,
            emailVerified: profile._json?.email_verified === true,
            fullName: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          };

          // GoogleProfile is intentionally passed here instead of Express.User.
          // The OAuth callback controller casts req.user back to GoogleProfile before handing it to the use-case. 
          // The double cast satisfies TS without lying about the runtime shape.
          return done(null, googleProfile as unknown as Express.User);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}
