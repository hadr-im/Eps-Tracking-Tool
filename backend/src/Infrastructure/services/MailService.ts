import * as nodemailer from 'nodemailer';
import { DispatchNotification, IMailService } from '../../Application/abstracts/IMailService';

/*
  Shared slate palette for all outgoing mail.

  Email clients strip <style> blocks and ignore most modern CSS, so every rule
  has to be inlined on the element and the layout built from tables. These
  constants keep the templates consistent without a stylesheet.
*/
const COLORS = {
  pageBg: '#f1f5f9',     // slate-100
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0', // slate-200
  panelBg: '#f8fafc',    // slate-50
  heading: '#0f172a',    // slate-900
  body: '#334155',       // slate-700
  muted: '#64748b',      // slate-500
  buttonBg: '#1e293b',   // slate-800
  buttonText: '#ffffff',
};

/*
  Wraps content in the standard shell: dark slate page, centred card, footer.
  600px is the width every major client renders without horizontal scrolling.
*/
function layout(title: string, inner: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.pageBg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.pageBg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${COLORS.cardBg};border:1px solid ${COLORS.cardBorder};border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.muted};">
                  EPs Tracking Tool
                </p>
              </td>
            </tr>
            ${inner}
            <tr>
              <td style="padding:0 32px 28px 32px;">
                <div style="height:1px;background-color:${COLORS.cardBorder};margin-bottom:16px;"></div>
                <p style="margin:0;font-size:12px;line-height:18px;color:${COLORS.muted};">
                  You are receiving this because you have an account on EPs Tracking Tool.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Escapes values that end up inside the HTML so a name can never break the markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  private get from(): string {
    return process.env.SMTP_FROM || `"EPs Tracking Tool" <${process.env.SMTP_USER}>`;
  }

  private get appUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    console.log(`[MailService] Preparing to send OTP for ${email}`);

    const inner = `
      <tr>
        <td style="padding:12px 32px 0 32px;">
          <h1 style="margin:0;font-size:22px;line-height:30px;font-weight:600;color:${COLORS.heading};">
            Reset your password
          </h1>
          <p style="margin:12px 0 0 0;font-size:15px;line-height:23px;color:${COLORS.body};">
            Use the code below to finish resetting your password.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.panelBg};border:1px solid ${COLORS.cardBorder};border-radius:10px;">
            <tr>
              <td align="center" style="padding:22px 16px;">
                <span style="font-size:30px;font-weight:700;letter-spacing:9px;color:${COLORS.heading};font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">
                  ${escapeHtml(otp)}
                </span>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:13px;line-height:20px;color:${COLORS.muted};">
            This code expires in 10 minutes. If you did not request it, you can ignore this email.
          </p>
        </td>
      </tr>`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Your password reset code',
        text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
        html: layout('Reset your password', inner),
      });
      console.log(`[MailService] Successfully sent OTP to ${email}`);
    } catch (error) {
      console.error(`[MailService] Failed to send OTP email to ${email}:`, error);
    }
  }

  /*
    Tells a member that leads have landed in their CRM.

    Failures are logged and swallowed: a dispatch that succeeded must not be
    reported as failed just because the mail server was unreachable.
  */
  async sendDispatchNotification(notification: DispatchNotification): Promise<void> {
    const { email, memberName, count, dispatcherName } = notification;
    const plural = count === 1 ? 'lead' : 'leads';
    const firstName = escapeHtml(memberName.trim().split(/\s+/)[0] ?? memberName);

    const assignedBy = dispatcherName
      ? `${escapeHtml(dispatcherName)} assigned them to you.`
      : 'They have been assigned to you.';

    const inner = `
      <tr>
        <td style="padding:12px 32px 0 32px;">
          <h1 style="margin:0;font-size:22px;line-height:30px;font-weight:600;color:${COLORS.heading};">
            You have new ${plural} to contact
          </h1>
          <p style="margin:12px 0 0 0;font-size:15px;line-height:23px;color:${COLORS.body};">
            Hi ${firstName}, ${assignedBy}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 8px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.panelBg};border:1px solid ${COLORS.cardBorder};border-radius:10px;">
            <tr>
              <td align="center" style="padding:26px 16px;">
                <p style="margin:0;font-size:40px;line-height:44px;font-weight:700;color:${COLORS.heading};">
                  ${count}
                </p>
                <p style="margin:6px 0 0 0;font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${COLORS.muted};">
                  New ${plural} in your CRM
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 28px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:${COLORS.buttonBg};border-radius:8px;">
                <a href="${this.appUrl}/crm"
                   style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:${COLORS.buttonText};text-decoration:none;">
                  Open my CRM
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0 0;font-size:13px;line-height:20px;color:${COLORS.muted};">
            Reach out to them while they are still warm, and keep their status updated as you go.
          </p>
        </td>
      </tr>`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: `${count} new ${plural} assigned to you`,
        text:
          `Hi ${memberName},\n\n` +
          `${count} new ${plural} have been assigned to you in the EPs Tracker.\n\n` +
          `Open your CRM: ${this.appUrl}/crm\n`,
        html: layout(`${count} new ${plural} assigned to you`, inner),
      });
      console.log(`[MailService] Dispatch notification sent to ${email} (${count} ${plural})`);
    } catch (error) {
      console.error(`[MailService] Failed to send dispatch notification to ${email}:`, error);
    }
  }
}
