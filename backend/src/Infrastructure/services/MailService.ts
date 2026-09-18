import * as nodemailer from 'nodemailer';
import { IMailService } from '../../Application/abstracts/IMailService';

export class MailService implements IMailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465', 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    console.log(`[MailService] Preparing to send OTP for ${email}: ${otp}`);

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || `"EPS Tracking Tool" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset OTP - EPS Tracking Tool',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>Password Reset</h2>
            <p>You requested to reset your password. Use the following 6-digit code to complete the process:</p>
            <div style="background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; margin: 24px 0;">
              ${otp}
            </div>
            <p style="color: #555; font-size: 14px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`[MailService] Successfully sent OTP to ${email}`);
    } catch (error) {
      console.error(`[MailService] Failed to send OTP email to ${email}:`, error);
    }
  }
}