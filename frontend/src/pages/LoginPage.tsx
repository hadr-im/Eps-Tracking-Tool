import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import axios from 'axios'

import { loginSchema, type LoginFormValues } from '@/schemas/loginSchema'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/services/apiClient'
import { getFriendlyError } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, PasswordInput } from '@/components/auth/AuthFormFields'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthLayout } from '@/components/auth/AuthLayout'
import type { AuthTokens } from '@/types/auth'

// LoginPage

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const passwordReset = searchParams.get('passwordReset') === 'true'
  const accountCreated = searchParams.get('created') === '1'
  const oauthError = searchParams.get('error')

  // Surface the redirect banners as toasts once, on arrival.
  useEffect(() => {
    if (passwordReset) toast.success('Password updated. Please sign in.')
    if (accountCreated) {
      toast.success('Your VP account is ready. Sign in with Google to continue.')
    }
    if (oauthError && oauthError !== 'oauth_failed') {
      toast.info(oauthError, { duration: 8000 })
    } else if (oauthError === 'oauth_failed') {
      toast.error("Couldn't sign in with Google. Please try again.")
    }
  }, [passwordReset, accountCreated, oauthError])

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginFormValues) {
    try {
      const { data } = await apiClient.post<AuthTokens>('/auth/login', values)
      login(data)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      // A 403 means the account exists but cannot sign in yet — awaiting
      // approval, declined, or disabled. The server explains which, and that
      // message is more useful than anything generic, so show it verbatim.
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const message = (err.response.data as { message?: unknown })?.message
        if (typeof message === 'string' && message.trim() !== '') {
          toast.error(message)
          return
        }
      }

      toast.error(getFriendlyError(err, {
        401: 'Incorrect email or password.',
        403: 'Your account is not yet approved. Please contact your VP.',
        429: 'Too many attempts. Please wait a moment and try again.',
      }, 'Something went wrong. Please try again.'))
    }
  }

  // Build the forgot-password URL with the current email value pre-filled so the OTP page knows which account to target
  function getForgotPasswordHref(): string {
    const email = getValues('email')
    const params = email ? `?email=${encodeURIComponent(email)}` : ''
    return `/forgot-password${params}`
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account"
      footerLink={
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      }
    >
      <>
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
            <span className="bg-card px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>
        </div>

        <GoogleButton label="Sign in with Google" />
      </>
    </AuthLayout>
  )
}
