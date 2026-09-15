import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schemas/resetPasswordSchema'
import { apiClient } from '@/services/apiClient'
import { getFriendlyError } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, PasswordInput } from '@/components/auth/AuthFormFields'

// ResetPasswordPage
//
// Reads ?email= and ?otp= from the URL (both were forwarded by VerifyOtpPage)
// Sends POST /auth/reset-password with { email, otp, newPassword }
// On success = redirects to /login with a success flag so LoginPage can show a confirmation message

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email') ?? ''
  const otp = searchParams.get('otp') ?? ''

  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Guard: if email or OTP is missing send back to forgot-password
  useEffect(() => {
    if (!email || !otp) navigate('/forgot-password', { replace: true })
  }, [email, otp, navigate])

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null)
    try {
      await apiClient.post('/auth/reset-password', {
        email,
        otp,
        newPassword: values.newPassword,
      })
      // Redirect to login (pass a flag so the login page can show a success toast/message)
      navigate('/login?passwordReset=true', { replace: true })
    } catch (err: unknown) {
      setServerError(getFriendlyError(err, {
        400: 'This code has expired or is invalid. Please request a new one.',
        404: 'No account found. Please start over.',
      }, 'Couldn\'t reset your password. Please try again.'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password for your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Field id="newPassword" label="New password" error={errors.newPassword?.message}>
            <PasswordInput
              id="newPassword"
              placeholder="Min 8 characters"
              autoComplete="new-password"
              aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
              aria-invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
          </Field>

          <Field
            id="confirmPassword"
            label="Confirm new password"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              placeholder="Repeat your new password"
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </Field>

          {/* Server-side error (OTP expired or invalid) */}
          {serverError && (
            <p role="alert" className="text-sm text-destructive text-center">
              {serverError}
            </p>
          )}

          <Button
            id="reset-password-submit"
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating password…
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>

      </div>
    </div>
  )
}
