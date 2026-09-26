import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schemas/resetPasswordSchema'
import { apiClient } from '@/services/apiClient'
import { getFriendlyError } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, PasswordInput } from '@/components/auth/AuthFormFields'
import { AuthLayout } from '@/components/auth/AuthLayout'

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
    try {
      await apiClient.post('/auth/reset-password', {
        email,
        otp,
        newPassword: values.newPassword,
      })
      // Redirect to login (pass a flag so the login page can show a success toast/message)
      navigate('/login?passwordReset=true', { replace: true })
    } catch (err: unknown) {
      toast.error(getFriendlyError(err, {
        400: 'This code has expired or is invalid. Please request a new one.',
        404: 'No account found. Please start over.',
      }, 'Couldn\'t reset your password. Please try again.'))
    }
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a strong password for your account"
    >
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
    </AuthLayout>
  )
}
