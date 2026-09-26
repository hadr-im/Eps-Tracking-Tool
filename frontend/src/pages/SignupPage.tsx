// SignupPage — two-step account request.
//
// Step 1 collects identity, step 2 collects placement in the organisation.
// Both steps are held in local state and submitted together in ONE request:
// creating the account at step 1 would leave an orphaned, department-less
// account behind every time someone abandoned the form at step 2.
//
// Signup does not sign anyone in. It creates a PENDING account that a VP has
// to approve, so it ends on the "waiting for approval" screen.

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { signupSchema, type SignupFormValues } from '@/schemas/signupSchema'
import { getSignupError, submitSignup } from '@/services/signupService'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, PasswordInput } from '@/components/auth/AuthFormFields'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { PlacementFields } from '@/components/auth/PlacementFields'
import { StepIndicator } from '@/components/auth/StepIndicator'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useDepartments } from '@/hooks/useSignupOptions'
import { EMPTY_PLACEMENT, type PlacementValue } from '@/types/signup'
import type { UserRole } from '@/types/auth'

export default function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [step, setStep] = useState<1 | 2>(1)
  const [placement, setPlacement] = useState<PlacementValue>(EMPTY_PLACEMENT)
  const [placementErrors, setPlacementErrors] = useState<
    Partial<Record<keyof PlacementValue, string>>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Warm the department list while the user is still filling in step 1, so
  // step 2 renders instantly instead of opening on a spinner. React Query
  // dedupes this with the lookup inside PlacementFields.
  useDepartments()

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  // Step 1 validates through zod, then advances. Nothing is sent yet.
  function goToPlacement(): void {
    setStep(2)
  }

  async function handleFinalSubmit(): Promise<void> {

    const nextErrors: Partial<Record<keyof PlacementValue, string>> = {}
    if (!placement.requestedDepartmentId) {
      nextErrors.requestedDepartmentId = 'Select your department'
    }
    if (!placement.requestedRole) {
      nextErrors.requestedRole = 'Select your position'
    }
    if (placement.requestedRole === 'VP' && !placement.vpSetupCode.trim()) {
      nextErrors.vpSetupCode = 'Enter your VP setup code'
    }
    setPlacementErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const identity = getValues()
    setIsSubmitting(true)
    try {
      const result = await submitSignup({
        email: identity.email,
        password: identity.password,
        fullName: identity.fullName,
        requestedRole: placement.requestedRole as UserRole,
        requestedDepartmentId: placement.requestedDepartmentId,
        requestedTeamLeaderId: placement.requestedTeamLeaderId,
        requestedIsDispatcher: placement.requestedIsDispatcher,
        vpSetupCode: placement.vpSetupCode.trim() || undefined,
      })

      // Signup issued a session, so the account is already usable — go
      // straight in rather than sending them to the login page.
      if (result.accessToken) {
        login({ accessToken: result.accessToken, user: result.user })
        navigate('/', { replace: true })
        return
      }

      toast.info(
        'Approval is done by the VP of the department you selected. If it is taking a while, reach out to them directly.',
        { duration: 8000 },
      )
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      toast.error(
        getSignupError(err, "Couldn't submit your request. Please try again."),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle={step === 1 ? 'Start with your details' : 'Tell us where you fit in the LC'}
      beforeContent={<StepIndicator current={step} total={2} className="mb-6" />}
      footerLink={
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <>
        {/* Step 1 — identity */}
        {step === 1 && (
          <>
            <form
              onSubmit={handleSubmit(goToPlacement)}
              noValidate
              className="flex flex-col gap-4"
            >
              <Field id="fullName" label="Full name" error={errors.fullName?.message}>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  autoComplete="name"
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
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </Field>

              <Field id="password" label="Password" error={errors.password?.message}>
                <PasswordInput
                  id="password"
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
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
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
              </Field>

              <Button id="signup-continue" type="submit" size="lg" className="mt-2 w-full">
                Continue
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-xs text-muted-foreground">or</span>
              </div>
            </div>

            <GoogleButton label="Sign up with Google" />
          </>
        )}

        {/* Step 2 — placement */}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleFinalSubmit()
            }}
            noValidate
            className="flex flex-col gap-4"
          >
            <PlacementFields
              value={placement}
              onChange={setPlacement}
              errors={placementErrors}
            />

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
                  Submitting…
                </>
              ) : (
                'Submit for approval'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-muted-foreground"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              <ArrowLeft size={14} />
              Back
            </Button>
          </form>
        )}
      </>
    </AuthLayout>
  )
}
