import { useState, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, ArrowLeft } from 'lucide-react'

import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schemas/forgotPasswordSchema'
import { apiClient } from '@/services/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// VerifyOtpPage
//
// Reads ?email= from the URL 
// User enters the 6-digit OTP received by email
// On success -> navigates to /reset-password?email=...&otp=...
// The OTP is forwarded as a URL param so ResetPasswordPage can include it in the POST /auth/reset-password payload without asking the user to re-enter it

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email') ?? ''

  const [serverError, setServerError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { otp: '' },
  })

  // Redirect away if no email param (user shouldn't land here directly)
  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true })
  }, [email, navigate])

  // Countdown timer cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function startCooldown() {
    setResendCooldown(60)
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleResend() {
    setServerError(null)
    try {
      await apiClient.post('/auth/forgot-password', { email })
      startCooldown()
    } catch {
      setServerError('Failed to resend OTP. Please try again.')
    }
  }

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null)
    try {
      // OTP can't be fully verified client-side (forward it to ResetPasswordPage which will include it in the POST /auth/reset-password payload)
      // If it's wrong, the backend returns a 400 and the user sees the error there
      navigate(
        `/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(values.otp)}`,
      )
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Invalid OTP. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Controller
              name="otp"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  aria-label="6-digit OTP code"
                  aria-describedby={errors.otp ? 'otp-error' : undefined}
                  aria-invalid={!!errors.otp}
                  className="text-center text-xl tracking-[0.5em] font-mono"
                  // Allow only digits
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                />
              )}
            />
            {errors.otp && (
              <p id="otp-error" className="text-xs text-destructive text-center">
                {errors.otp.message}
              </p>
            )}
          </div>

          {/* Server-side error */}
          {serverError && (
            <p role="alert" className="text-sm text-destructive text-center">
              {serverError}
            </p>
          )}

          <Button
            id="verify-otp-submit"
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Verifying…
              </>
            ) : (
              'Verify code'
            )}
          </Button>
        </form>

        {/* Resend + Back links */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Didn't receive it?{' '}
            {resendCooldown > 0 ? (
              <span className="text-muted-foreground">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-medium text-foreground underline-offset-4 hover:underline transition-colors"
              >
                Resend code
              </button>
            )}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>
        </div>

      </div>
    </div>
  )
}
