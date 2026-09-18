import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, AlertCircle, KeyRound, User, Info } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useChangePassword } from '@/hooks/useChangePassword';
import {
  profileSchema,
  changePasswordSchema,
  type ProfileFormValues,
  type ChangePasswordFormValues,
} from '@/schemas/profileSchema';
import { getFriendlyError } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, PasswordInput } from '@/components/auth/AuthFormFields';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';

// helpers 

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'Member',
  TEAM_LEADER: 'Team Leader',
  VP: 'VP',
};

// Change Password Dialog 

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const { mutateAsync: changePassword, isPending } = useChangePassword();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (!open) {
      reset();
      setSuccess(false);
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(values: ChangePasswordFormValues) {
    setServerError(null);
    setSuccess(false);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSuccess(true);
      reset();
    } catch (err: unknown) {
      setServerError(getFriendlyError(err, {
        400: 'The current password you entered is incorrect.',
        401: 'The current password you entered is incorrect.',
        422: 'Your new password doesn\'t meet the requirements.',
      }, 'Couldn\'t update your password. Please try again.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <KeyRound size={14} />
            Change Password
          </Button>
        }
      />
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
            <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
            <div>
              <p className="font-semibold">Password changed!</p>
              <p className="text-sm text-muted-foreground mt-1">Other sessions have been logged out.</p>
            </div>
            <Button className="mt-4 w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 mt-2">
            <Field
              id="current-password"
              label="Current Password"
              error={errors.currentPassword?.message}
            >
              <PasswordInput
                id="current-password"
                placeholder="Your current password"
                autoComplete="current-password"
                aria-invalid={!!errors.currentPassword}
                {...register('currentPassword')}
              />
            </Field>

            <Field id="new-password" label="New Password" error={errors.newPassword?.message}>
              <PasswordInput
                id="new-password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria-invalid={!!errors.newPassword}
                {...register('newPassword')}
              />
            </Field>

            <Field
              id="confirm-password"
              label="Confirm New Password"
              error={errors.confirmPassword?.message}
            >
              <PasswordInput
                id="confirm-password"
                placeholder="Repeat new password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
            </Field>

            {serverError && (
              <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
                <AlertCircle size={14} className="shrink-0" />
                {serverError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Edit Profile Section 

function EditProfileForm() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const isGoogle = user?.provider === 'GOOGLE';

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

  // Pre-fill once profile loads
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl ?? '',
      });
    }
  }, [profile, reset]);

  const avatarUrlValue = watch('avatarUrl');
  const displayName = watch('fullName') || user?.fullName || '';

  async function onSubmit(values: ProfileFormValues) {
    setServerError(null);
    setSuccess(false);
    try {
      await updateProfile({
        fullName: values.fullName,
        avatarUrl: values.avatarUrl || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setServerError(getFriendlyError(err, {
        400: 'Please check your details and try again.',
      }, 'Couldn\'t save your profile. Please try again.'));
    }
  }

  return (
    <section aria-labelledby="edit-profile-heading">
      <div className="flex items-center gap-2 mb-4">
        <User size={16} className="text-muted-foreground" />
        <h2 id="edit-profile-heading" className="text-sm font-semibold">
          Edit Profile
        </h2>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4 mb-6">
        {isLoading ? (
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        ) : (
          <Avatar className="h-16 w-16 text-base shrink-0">
            <AvatarImage src={avatarUrlValue || profile?.avatarUrl || ''} alt={displayName} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <p className="font-semibold text-sm truncate">{profile?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role}
                </Badge>
              </div>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {/* Read-only email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={profile?.email ?? ''}
            disabled
            className="bg-muted/50 text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>

        <Field id="profile-fullName" label="Full Name" error={errors.fullName?.message}>
          <Input
            id="profile-fullName"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />
        </Field>

        <Field id="profile-avatarUrl" label="Avatar URL" error={errors.avatarUrl?.message}>
          <Input
            id="profile-avatarUrl"
            type="url"
            placeholder="Publicly accessible image URL"
            aria-invalid={!!errors.avatarUrl}
            {...register('avatarUrl')}
          />
        </Field>

        {serverError && (
          <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
            <AlertCircle size={14} className="shrink-0" />
            {serverError}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400" role="status">
            <CheckCircle2 size={14} className="shrink-0" />
            Profile updated successfully!
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            id="profile-save-btn"
            type="submit"
            size="sm"
            disabled={isPending || !isDirty}
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
      
      {/* Password / Google info section at the bottom of the profile card */}
      <div className="mt-8 border-t pt-6">
        {isGoogle ? (
          <div className="flex items-start gap-3">
            <Info size={16} className="shrink-0 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1">Signed in with Google</p>
              <p className="text-sm text-muted-foreground">
                Your account uses Google Sign-In. To set a password, use{' '}
                <a
                  href="/forgot-password"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Forgot Password
                </a>{' '}
                from the login page.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Password</p>
              <p className="text-xs text-muted-foreground">Change your current password</p>
            </div>
            <ChangePasswordDialog />
          </div>
        )}
      </div>
    </section>
  );
}


// Page 

export default function ProfilePage() {
  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="shrink-0 pl-4 pr-16 md:px-6 pt-4 md:pt-5 pb-3 border-b bg-card">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account information and security settings
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-6">
        <div className="max-w-xl mx-auto w-full">
          <div className="rounded-xl border bg-card p-6">
            <EditProfileForm />
          </div>
        </div>
      </div>
    </div>
  );
}
