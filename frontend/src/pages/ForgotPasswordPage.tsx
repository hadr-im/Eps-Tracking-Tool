import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, ArrowLeft } from 'lucide-react'
import { z } from 'zod'

import { apiClient } from '@/services/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/auth/AuthFormFields'

const emailOnlySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type EmailOnlyFormValues = z.infer<typeof emailOnlySchema>

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialEmail = searchParams.get('email') || ''
  
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EmailOnlyFormValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: initialEmail },
  })

  // Auto send OTP if email query parameter is present and valid
  useEffect(() => {
    if (initialEmail && z.string().email().safeParse(initialEmail).success) {
      setValue('email', initialEmail)
      sendOtp(initialEmail)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail])

  async function sendOtp(email: string) {
    setServerError(null)
    setIsSending(true)
    try {
      await apiClient.post('/auth/forgot-password', { email })
      // Forward user to OTP verification page with email in query params
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`, { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to send OTP. Please try again.'
      setServerError(message)
    } finally {
      setIsSending(false)
    }
  }

  function onSubmit(values: EmailOnlyFormValues) {
    sendOtp(values.email)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Forgot Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email to receive a 6-digit verification code
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Field id="email" label="Email address" error={errors.email?.message}>
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

          {/* Server-side error */}
          {serverError && (
            <p role="alert" className="text-sm text-destructive text-center">
              {serverError}
            </p>
          )}

          <Button
            id="forgot-password-submit"
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending OTP…
              </>
            ) : (
              'Send OTP'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
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
