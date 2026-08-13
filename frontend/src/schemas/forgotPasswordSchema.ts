import { z } from 'zod';

// Mirrors backend ResetPasswordDto:
//   otp @Length(6, 6) exactly 6 digits

export const forgotPasswordSchema = z.object({
  otp: z
    .string()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
