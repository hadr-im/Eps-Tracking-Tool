// CompleteGoogleSignupPage — step 2 for the Google flow.
//
// Reached only via redirect from the OAuth callback, for a Google profile with
// no account yet. The `token` in the URL is a short-lived setup token carrying
// the verified Google identity; no user row exists until this form is
// submitted, so leaving the page creates nothing.

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { completeGoogleSignup, getSignupError } from '@/services/signupService'
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { PlacementFields } from '@/components/auth/PlacementFields';
import { StepIndicator } from '@/components/auth/StepIndicator';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { EMPTY_PLACEMENT, type PlacementValue } from '@/types/signup';
import type { UserRole } from '@/types/auth';

export default function CompleteGoogleSignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const setupToken = searchParams.get('token');

  const [placement, setPlacement] = useState<PlacementValue>(EMPTY_PLACEMENT);
  const [placementErrors, setPlacementErrors] = useState<
    Partial<Record<keyof PlacementValue, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Landed here without a token — nothing can be completed.
  if (!setupToken) {
    return (
      <AuthLayout
        title="Signup session missing"
        subtitle="Start again from the sign-in page."
      >
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => navigate('/login', { replace: true })}
        >
          Back to sign in
        </Button>
      </AuthLayout>
    );
  }

  async function handleSubmit(): Promise<void> {

    const nextErrors: Partial<Record<keyof PlacementValue, string>> = {};
    if (!placement.requestedDepartmentId) {
      nextErrors.requestedDepartmentId = 'Select your department';
    }
    if (!placement.requestedRole) {
      nextErrors.requestedRole = 'Select your position';
    }
    if (placement.requestedRole === 'VP' && !placement.vpSetupCode.trim()) {
      nextErrors.vpSetupCode = 'Enter your VP setup code';
    }
    setPlacementErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await completeGoogleSignup({
        setupToken: setupToken!,
        requestedRole: placement.requestedRole as UserRole,
        requestedDepartmentId: placement.requestedDepartmentId,
        requestedTeamLeaderId: placement.requestedTeamLeaderId,
        requestedIsDispatcher: placement.requestedIsDispatcher,
        vpSetupCode: placement.vpSetupCode.trim() || undefined,
      });

      // Signup issued a session. There is no password to sign in with on this
      // path, which is exactly why the server hands back the token directly.
      if (result.accessToken) {
        login({ accessToken: result.accessToken, user: result.user });
        navigate('/', { replace: true });
        return;
      }

      toast.info(
        'Approval is done by the VP of the department you selected. If it is taking a while, reach out to them directly.',
        { duration: 8000 },
      );
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      toast.error(
        getSignupError(err, "Couldn't complete your signup. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Almost there"
      subtitle="Tell us where you fit in the LC"
      beforeContent={<StepIndicator current={2} total={2} className="mb-6" />}
    >
      <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
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
            id="complete-signup-submit"
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
      </form>
    </AuthLayout>
  );
}
