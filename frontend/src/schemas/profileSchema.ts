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

// Schema for the Change Password form
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
