/*
 Contract for sending transactional emails.
 Defined in Application so use-cases depend only on this abstraction.
 The concrete implementation (SMTP / Resend / etc.) lives in Infrastructure.
 */

export interface DispatchNotification {
  // Who is being notified
  email: string;
  memberName: string;
  // How many EPs were just assigned to them
  count: number;
  // Who assigned them, when known
  dispatcherName?: string | null;
}

export interface IMailService {
  // Send a one-time password to the user's email address
  sendOtp(email: string, otp: string): Promise<void>;
  // Tell a member that leads have just been assigned to them
  sendDispatchNotification(notification: DispatchNotification): Promise<void>;
}
