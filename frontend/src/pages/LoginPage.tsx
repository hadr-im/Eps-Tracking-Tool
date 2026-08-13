import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'

import { loginSchema, type LoginFormValues } from '@/schemas/loginSchema'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/services/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, PasswordInput } from '@/components/auth/AuthFormFields'
import { GoogleButton } from '@/components/auth/GoogleButton'
import type { AuthTokens } from '@/types/auth'

// LoginPage

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)

  const passwordReset = searchParams.get('passwordReset') === 'true'

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    try {
      const { data } = await apiClient.post<AuthTokens>('/auth/login', values)
      login(data)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Something went wrong. Please try again.'
      setServerError(message)
    }
  }

  // Build the forgot-password URL with the current email value pre-filled so the OTP page knows which account to target
  function getForgotPasswordHref(): string {
    const email = getValues('email')
    const params = email ? `?email=${encodeURIComponent(email)}` : ''
    return `/forgot-password${params}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        {/* Password reset success banner */}
        {passwordReset && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
            <CheckCircle2 size={16} className="shrink-0 text-green-600 dark:text-green-400" />
            Password updated successfully. Please sign in.
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
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
              placeholder="Your password"
              autoComplete="current-password"
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {/* Forgot password — rendered inside the field to sit below the input */}
            <div className="flex justify-end">
              <Link
                to={getForgotPasswordHref()}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </Field>

          {/* Server-side error */}
          {serverError && (
            <p role="alert" className="text-sm text-destructive text-center">
              {serverError}
            </p>
          )}

          <Button
            id="login-submit"
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
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

        <GoogleButton label="Sign in with Google" />

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>

      </div>
    </div>
  )
}
