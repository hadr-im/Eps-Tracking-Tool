import { z } from 'zod';

// Mirrors backend SignupDto constraints:
//   email     -> @IsEmail()
//   password  -> @MinLength(8)
//   fullName  -> @MinLength(2)
// confirmPassword is frontend-only (not sent to the API)

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters'),

    email: z
      .string()
      .email('Please enter a valid email address'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),

    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
