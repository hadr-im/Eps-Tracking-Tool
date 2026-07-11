import { IMailService } from '../../Application/abstracts/IMailService';

/*
 Placeholder mail service — logs OTPs to the console.
 Replace with a real provider (Resend, Nodemailer, SendGrid, etc.) when ready.
 */
export class MailService implements IMailService {
  async sendOtp(email: string, otp: string): Promise<void> {
    // TODO: integrate a real email provider
    console.log(`[MailService] OTP for ${email}: ${otp}`);
  }
}
