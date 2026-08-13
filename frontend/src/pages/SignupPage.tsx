import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { signupSchema, type SignupFormValues } from '@/schemas/signupSchema'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/services/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, PasswordInput } from '@/components/auth/AuthFormFields'
import { GoogleButton } from '@/components/auth/GoogleButton'
import type { AuthTokens } from '@/types/auth'


export default function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(values: SignupFormValues) {
    setServerError(null)
    try {
      // Strip confirmPassword (backend doesn't accept it)
      const { confirmPassword: _, ...payload } = values

      // Signup returns just the created user (no tokens)
      await apiClient.post('/auth/signup', payload)

      // Immediately log the user in to get tokens
      const { data } = await apiClient.post<AuthTokens>('/auth/login', {
        email: payload.email,
        password: payload.password,
      })

      login(data)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Something went wrong. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in your details to get started
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field id="fullName" label="Full name" error={errors.fullName?.message}>
            <Input
              id="fullName"
              placeholder="John Doe"
              autoComplete="name"
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
            />
          </Field>

          <Field id="email" label="Email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          <Field id="password" label="Password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              placeholder="Min 8 characters"
              autoComplete="new-password"
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </Field>

          <Field
            id="confirmPassword"
            label="Confirm password"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              placeholder="Repeat your password"
              autoComplete="new-password"
              aria-describedby={
                errors.confirmPassword ? 'confirmPassword-error' : undefined
              }
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </Field>

          {/* Server-side error */}
          {serverError && (
            <p role="alert" className="text-sm text-destructive text-center">
              {serverError}
            </p>
          )}

          <Button
            id="signup-submit"
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>
        </div>

        <GoogleButton label="Sign up with Google" />

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
