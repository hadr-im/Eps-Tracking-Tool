import { z } from 'zod';

// Mirrors backend LoginDto constraints
//   email : @IsEmail()
//   password : @MinLength(1) (no strength rule on login, server validates credentials)

export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
