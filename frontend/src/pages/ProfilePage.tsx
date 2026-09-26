// ProfilePage — account settings for the signed-in user.
//
// Two sections, each in its own card so the page reads as part of the app:
//
//   1. Profile — display name and avatar URL (email is read-only)
//   2. Password — three fields (change) for LOCAL accounts, two (set) for
//      Google-only accounts that never picked a password
//
// The password section replaces the old "Signed in with Google, use forgot
// password from the login page" message: Google users can now set a password
// in place, and once they do their provider flips to LOCAL and the form
// switches to the change-password shape.

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useChangePassword } from '@/hooks/useChangePassword';
import {
  profileSchema,
  makePasswordSchema,
  type ProfileFormValues,
} from '@/schemas/profileSchema';
import { getFriendlyError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SoftBadge } from '@/components/ui/soft-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, PasswordInput } from '@/components/auth/AuthFormFields';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserAvatar } from '@/components/layout/UserAvatar';

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'Member',
  TEAM_LEADER: 'Team Leader',
  VP: 'Vice President',
};

/*
  Reusable card frame. Kept internal so the profile sections match each other
  and match the cards used elsewhere on the app (Members, Approvals, EPs).
*/
function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="px-5 py-4 border-b border-border/70">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

// Identity — name + avatar URL. Email is read-only.

function ProfileSection() {
  const { user, updateUser } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', avatarUrl: '' },
  });

  useEffect(() => {
    if (profile) {
      reset({ fullName: profile.fullName, avatarUrl: profile.avatarUrl ?? '' });
    }
  }, [profile, reset]);

  // Live preview: avatar and name follow what's being typed.
  const displayName = watch('fullName') || profile?.fullName || '';
  const avatarPreview = watch('avatarUrl') || profile?.avatarUrl || '';

  async function onSubmit(values: ProfileFormValues) {
    try {
      await updateProfile({
        fullName: values.fullName,
        avatarUrl: values.avatarUrl || undefined,
      });
      updateUser({ fullName: values.fullName, avatarUrl: values.avatarUrl || null });
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error(
        getFriendlyError(
          err,
          { 400: 'Please check your details and try again.' },
          "Couldn't save your profile. Please try again.",
        ),
      );
    }
  }

  return (
    <SectionCard title="Profile" description="How you appear across the app">
      {/* Identity summary */}
      <div className="flex items-center gap-4 pb-5 mb-5 border-b border-border/70">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-14 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </>
        ) : (
          <>
            <UserAvatar
              fullName={displayName}
              email={profile?.email}
              avatarUrl={avatarPreview}
              className="h-14 w-14"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              <div className="mt-1.5">
                <SoftBadge tone="blue">
                  {ROLE_LABELS[profile?.role ?? user?.role ?? ''] ?? profile?.role}
                </SoftBadge>
              </div>
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={profile?.email ?? ''}
            disabled
            className="rounded-lg"
          />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>

        <Field id="profile-fullName" label="Full name" error={errors.fullName?.message}>
          <Input
            id="profile-fullName"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            className="rounded-lg"
            {...register('fullName')}
          />
        </Field>

        <Field id="profile-avatarUrl" label="Avatar URL" error={errors.avatarUrl?.message}>
          <Input
            id="profile-avatarUrl"
            type="url"
            placeholder="https://…"
            aria-invalid={!!errors.avatarUrl}
            className="rounded-lg"
            {...register('avatarUrl')}
          />
        </Field>

        <Button
          id="profile-save-btn"
          type="submit"
          size="lg"
          className="mt-2 w-full rounded-lg bg-aiesec-blue text-white hover:bg-aiesec-blue/90"
          disabled={isPending || !isDirty}
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </form>
    </SectionCard>
  );
}

// Password — set (Google) or change (LOCAL). One form, one endpoint.

// Matches the Zod schema exactly: an omitted current password parses as
// undefined, so the react-hook-form default must be `undefined` too.
interface PasswordFormValues {
  currentPassword: string | undefined;
  newPassword: string;
  confirmPassword: string;
}

function PasswordSection() {
  const { user, updateUser } = useAuth();
  const { mutateAsync: changePassword, isPending } = useChangePassword();

  /*
    provider is a reliable proxy for "has a password". Google-only accounts
    start as GOOGLE; once they set a password here the backend switches them
    to LOCAL, which flips this form to the three-field change shape.
  */
  const hasPassword = user?.provider === 'LOCAL';

  const schema = useMemo(() => makePasswordSchema(hasPassword), [hasPassword]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: PasswordFormValues) {
    try {
      await changePassword({
        currentPassword: hasPassword ? values.currentPassword! : undefined,
        newPassword: values.newPassword,
      });
      // On first set, the user's provider is now LOCAL — surface that to the
      // rest of the app so the form re-renders as change-password.
      if (!hasPassword) updateUser({ provider: 'LOCAL' });
      reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      // useChangePassword already toasts on error
    }
  }

  return (
    <SectionCard
      title={hasPassword ? 'Change password' : 'Set a password'}
      description={
        hasPassword
          ? 'You will be signed out of other devices when you change it.'
          : 'Your account uses Google Sign-In. Set a password to also sign in with your email.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {hasPassword && (
          <Field
            id="current-password"
            label="Current password"
            error={errors.currentPassword?.message}
          >
            <PasswordInput
              id="current-password"
              placeholder="Your current password"
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              className="rounded-lg"
              {...register('currentPassword')}
            />
          </Field>
        )}

        <Field id="new-password" label="New password" error={errors.newPassword?.message}>
          <PasswordInput
            id="new-password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            className="rounded-lg"
            {...register('newPassword')}
          />
        </Field>

        <Field
          id="confirm-password"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirm-password"
            placeholder="Repeat the new password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            className="rounded-lg"
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" size="lg" className="mt-2 w-full rounded-lg" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {hasPassword ? 'Updating…' : 'Saving…'}
            </>
          ) : hasPassword ? (
            'Update password'
          ) : (
            'Set password'
          )}
        </Button>
      </form>
    </SectionCard>
  );
}

// Page

export default function ProfilePage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="My Profile"
        subtitle="Manage your account information and security"
      />

      <div className="flex-1 overflow-auto px-4 md:px-6 py-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProfileSection />
          <PasswordSection />
        </div>
      </div>
    </div>
  );
}
