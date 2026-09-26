import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, ArrowLeft } from 'lucide-react'
import { z } from 'zod'

import { apiClient } from '@/services/apiClient'
import { getFriendlyError } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/auth/AuthFormFields'
import { AuthLayout } from '@/components/auth/AuthLayout'

const emailOnlySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type EmailOnlyFormValues = z.infer<typeof emailOnlySchema>

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialEmail = searchParams.get('email') || ''
  
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
    setIsSending(true)
    try {
      await apiClient.post('/auth/forgot-password', { email })
      // Forward user to OTP verification page with email in query params
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`, { replace: true })
    } catch (err: unknown) {
      toast.error(getFriendlyError(err, {
        400: 'Please provide a valid email address.',
        404: 'No account found with that email address.',
        429: 'Please wait a moment before requesting another code.',
      }, 'Couldn\'t send the code. Please try again.'))
    } finally {
      setIsSending(false)
    }
  }

  function onSubmit(values: EmailOnlyFormValues) {
    sendOtp(values.email)
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a 6-digit verification code"
      footerLink={
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      }
    >
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
              Sending code…
            </>
          ) : (
            'Send verification code'
          )}
        </Button>
      </form>
    </AuthLayout>
  )
}
