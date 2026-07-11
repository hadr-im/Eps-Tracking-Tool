/*
 Domain entity for a hashed one-time password used in password-reset flow.
 The raw OTP is sent to the user's email; only its bcrypt hash is stored.
 */
export class OtpToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    // bcrypt hash of the 6-digit raw OTP
    public readonly otpHash: string,
    public isUsed: boolean,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
  ) {}
}
