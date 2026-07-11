/*
 Domain entity representing a hashed refresh token stored in the DB.
 The actual JWT value is never persisted — only its bcrypt hash.
 */
export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    // bcrypt hash of the raw refresh-token JWT string
    public readonly tokenHash: string,
    public isRevoked: boolean,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
  ) {}
}
