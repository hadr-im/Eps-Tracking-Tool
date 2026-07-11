/*
 Defines the authentication provider used when the account was created
  - LOCAL: Standard email + password registration
  - GOOGLE: Account created via Google OAuth
 */
export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}
