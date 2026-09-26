import { z } from 'zod';

// Schema for the Edit Profile form
export const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters'),
  avatarUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

/*
  One schema for both flows.

  Change: current + new + confirm.
  Set (first time, Google users): new + confirm only. Refined so the current
  password is only required when the caller says so, keeping a single form
  wired to a single mutation.
*/
export function makePasswordSchema(requireCurrent: boolean) {
  return z
    .object({
      currentPassword: requireCurrent
        ? z.string().min(1, 'Current password is required')
        : z.string().optional(),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
      confirmPassword: z.string().min(1, 'Please confirm your new password'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
}

// Back-compat: the previous schema was the change-password shape.
export const changePasswordSchema = makePasswordSchema(true);
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
