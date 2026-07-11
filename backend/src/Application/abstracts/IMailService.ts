/*
 Contract for sending transactional emails.
 Defined in Application so use-cases depend only on this abstraction.
 The concrete implementation (SMTP / Resend / etc.) lives in Infrastructure.
 */

export interface IMailService {
  // Send a one-time password to the user's email address
  sendOtp(email: string, otp: string): Promise<void>;
}
