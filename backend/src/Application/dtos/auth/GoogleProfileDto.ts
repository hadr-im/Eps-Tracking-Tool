/*
 Shape of the Google profile extracted by the Passport strategy.
 Passed from the OAuth callback route into googleAuth use-case.
 */
export interface GoogleProfileDto {
  googleId: string;
  email: string;
  fullName: string;
  avatar: string | undefined;
}
